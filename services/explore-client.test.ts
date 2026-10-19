import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HttpResponse, delay, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../mocks/server";
import { fetchExplorePage } from "./explore-client";

const EXPLORE_URL = "*/api/explore";

const MOVIE = {
  id: 550,
  title: "Fight Club",
  posterUrl: "https://image.tmdb.org/t/p/w500/poster.jpg",
  releaseYear: 1999,
  rating: 8.4,
};

const PAGE = { movies: [MOVIE], page: 1, totalPages: 5 };

function captureUrl(body: unknown = PAGE) {
  const captured: { url?: URL } = {};
  server.use(
    http.get(EXPLORE_URL, ({ request }) => {
      captured.url = new URL(request.url);
      return HttpResponse.json(body as Record<string, unknown>);
    })
  );
  return captured;
}

describe("fetchExplorePage", () => {
  it("requests /api/explore with only page for popular", async () => {
    const captured = captureUrl();

    await fetchExplorePage({ mode: "popular" }, 1);

    expect(captured.url?.pathname).toBe("/api/explore");
    expect(captured.url?.searchParams.get("page")).toBe("1");
    expect(captured.url?.searchParams.has("genre")).toBe(false);
    expect(captured.url?.searchParams.has("q")).toBe(false);
  });

  it("builds the discover query from the filters plus page (RF-5)", async () => {
    const captured = captureUrl();

    await fetchExplorePage(
      { mode: "discover", genreId: 28, year: 1999, sort: "popularity.asc" },
      2
    );

    const params = captured.url?.searchParams;
    expect(params?.get("genre")).toBe("28");
    expect(params?.get("year")).toBe("1999");
    expect(params?.get("sort")).toBe("popularity.asc");
    expect(params?.get("page")).toBe("2");
    expect(params?.has("q")).toBe(false);
  });

  it("builds the search query from the filters plus page (RF-6)", async () => {
    const captured = captureUrl();

    await fetchExplorePage({ mode: "search", query: "fight club" }, 3);

    const params = captured.url?.searchParams;
    expect(params?.get("q")).toBe("fight club");
    expect(params?.get("page")).toBe("3");
    expect(params?.has("genre")).toBe(false);
  });

  it("resolves ok:true with the parsed MoviePage for a valid body (RF-11)", async () => {
    captureUrl();

    expect(await fetchExplorePage({ mode: "popular" }, 1)).toEqual({
      ok: true,
      data: PAGE,
    });
  });

  it("accepts an empty page (RF-13)", async () => {
    captureUrl({ movies: [], page: 1, totalPages: 0 });

    expect(await fetchExplorePage({ mode: "popular" }, 1)).toEqual({
      ok: true,
      data: { movies: [], page: 1, totalPages: 0 },
    });
  });

  it("accepts movies with null poster, year and rating", async () => {
    const bare = { id: 1, title: "X", posterUrl: null, releaseYear: null, rating: null };
    captureUrl({ movies: [bare], page: 1, totalPages: 1 });

    expect(await fetchExplorePage({ mode: "popular" }, 1)).toEqual({
      ok: true,
      data: { movies: [bare], page: 1, totalPages: 1 },
    });
  });

  it("rebuilds the upstream error from a 502 body (RF-14)", async () => {
    server.use(
      http.get(EXPLORE_URL, () =>
        HttpResponse.json({ reason: "http", status: 429 }, { status: 502 })
      )
    );
    expect(await fetchExplorePage({ mode: "popular" }, 1)).toEqual({
      ok: false,
      error: { reason: "http", status: 429 },
    });

    server.use(
      http.get(EXPLORE_URL, () =>
        HttpResponse.json({ reason: "network" }, { status: 502 })
      )
    );
    expect(await fetchExplorePage({ mode: "popular" }, 1)).toEqual({
      ok: false,
      error: { reason: "network" },
    });

    server.use(
      http.get(EXPLORE_URL, () =>
        HttpResponse.json({ reason: "invalid_response" }, { status: 502 })
      )
    );
    expect(await fetchExplorePage({ mode: "popular" }, 1)).toEqual({
      ok: false,
      error: { reason: "invalid_response" },
    });
  });

  it("returns reason: http with the status for any other HTTP error (RF-14)", async () => {
    server.use(http.get(EXPLORE_URL, () => new HttpResponse(null, { status: 500 })));

    expect(await fetchExplorePage({ mode: "popular" }, 1)).toEqual({
      ok: false,
      error: { reason: "http", status: 500 },
    });
  });

  it("returns reason: http for a 502 whose body isn't a known error shape", async () => {
    server.use(
      http.get(EXPLORE_URL, () => HttpResponse.json({ oops: 1 }, { status: 502 }))
    );

    expect(await fetchExplorePage({ mode: "popular" }, 1)).toEqual({
      ok: false,
      error: { reason: "http", status: 502 },
    });
  });

  it("returns reason: network on a network failure (RF-14, RF-15)", async () => {
    server.use(http.get(EXPLORE_URL, () => HttpResponse.error()));

    expect(await fetchExplorePage({ mode: "popular" }, 1)).toEqual({
      ok: false,
      error: { reason: "network" },
    });
  });

  it("returns reason: invalid_response for a malformed 200 body (constitution §4)", async () => {
    server.use(http.get(EXPLORE_URL, () => HttpResponse.json({ nonsense: true })));
    expect(await fetchExplorePage({ mode: "popular" }, 1)).toEqual({
      ok: false,
      error: { reason: "invalid_response" },
    });

    server.use(
      http.get(EXPLORE_URL, () => new HttpResponse("<html>", { status: 200 }))
    );
    expect(await fetchExplorePage({ mode: "popular" }, 1)).toEqual({
      ok: false,
      error: { reason: "invalid_response" },
    });
  });

  it("does not send the request when the signal is already aborted (Risk #5)", async () => {
    const handler = vi.fn(() => HttpResponse.json(PAGE));
    server.use(http.get(EXPLORE_URL, handler));
    const controller = new AbortController();
    controller.abort();

    const result = await fetchExplorePage(
      { mode: "popular" },
      1,
      controller.signal
    );

    expect(result).toEqual({ ok: false, error: { reason: "network" } });
    expect(handler).not.toHaveBeenCalled();
  });

  it("cancels an in-flight request when the signal aborts (Risk #5)", async () => {
    let requestReceived!: () => void;
    const received = new Promise<void>((resolve) => (requestReceived = resolve));
    server.use(
      http.get(EXPLORE_URL, async () => {
        requestReceived();
        await delay("infinite");
        return HttpResponse.json(PAGE);
      })
    );
    const controller = new AbortController();

    const pending = fetchExplorePage({ mode: "popular" }, 1, controller.signal);
    await received;
    controller.abort();

    expect(await pending).toEqual({ ok: false, error: { reason: "network" } });
  });
});

describe("explore-client.ts source", () => {
  const source = readFileSync(join(__dirname, "explore-client.ts"), "utf-8");

  it("stays browser-safe: no server-only import and no token reference", () => {
    expect(source).not.toContain("server-only");
    expect(source).not.toContain("TMDB_ACCESS_TOKEN");
    expect(source).not.toMatch(/from ["']\.\/(tmdb-config|explore-service)["']/);
  });
});

// The proxy sends the home's featured movie with the popular list's first page
// (home-redesign RF-7). The browser re-validates it like the rest (§4).
describe("fetchExplorePage: featured movie", () => {
  const FEATURED = {
    id: 7,
    title: "Backdrop Movie",
    overview: "A story.",
    backdropUrl: "https://image.tmdb.org/t/p/original/bd.jpg",
    genreIds: [18, 53],
    releaseYear: 1999,
    rating: 8.4,
  };

  it("keeps a valid featured movie in the parsed page (RF-7)", async () => {
    captureUrl({ ...PAGE, featured: FEATURED });

    expect(await fetchExplorePage({ mode: "popular" }, 1)).toEqual({
      ok: true,
      data: { ...PAGE, featured: FEATURED },
    });
  });

  it("accepts a featured movie with no year and no rating", async () => {
    const bare = { ...FEATURED, releaseYear: null, rating: null, overview: "" };
    captureUrl({ ...PAGE, featured: bare });

    const result = await fetchExplorePage({ mode: "popular" }, 1);

    expect(result.ok && result.data.featured).toEqual(bare);
  });

  it("leaves the key out when the proxy sends none", async () => {
    captureUrl();

    const result = await fetchExplorePage({ mode: "popular" }, 1);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).not.toHaveProperty("featured");
  });

  it.each([
    ["no backdrop address", { ...FEATURED, backdropUrl: undefined }],
    ["genre ids that are not a list", { ...FEATURED, genreIds: "18" }],
    ["a rating that is text", { ...FEATURED, rating: "8.4" }],
    ["a missing title", { ...FEATURED, title: undefined }],
    ["null instead of absent", null],
  ])("rejects a featured movie with %s as invalid_response", async (_label, bad) => {
    captureUrl({ ...PAGE, featured: bad });

    expect(await fetchExplorePage({ mode: "popular" }, 1)).toEqual({
      ok: false,
      error: { reason: "invalid_response" },
    });
  });
});
