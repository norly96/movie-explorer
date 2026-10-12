import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../../../mocks/server";

// The handler's services are server-only. Mocking the config (instead of
// setting the env var) keeps the secret's name out of app/, which
// services/no-secret-leak.test.ts scans.
vi.mock("server-only", () => ({}));
vi.mock("../../../services/tmdb-config", () => ({
  getTmdbConfig: () => ({
    accessToken: "secret-test-value",
    baseUrl: "https://api.themoviedb.org/3",
    imageBaseUrl: "https://image.tmdb.org/t/p/w500",
  }),
}));

const { GET } = await import("./route");

const BASE = "https://api.themoviedb.org/3";
const POPULAR_URL = `${BASE}/movie/popular`;
const DISCOVER_URL = `${BASE}/discover/movie`;
const SEARCH_URL = `${BASE}/search/movie`;

const RAW_MOVIE = {
  id: 550,
  title: "Fight Club",
  poster_path: "/poster.jpg",
  release_date: "1999-10-15",
  vote_average: 8.4,
  vote_count: 26000,
};

const MAPPED_MOVIE = {
  id: 550,
  title: "Fight Club",
  posterUrl: "https://image.tmdb.org/t/p/w500/poster.jpg",
  releaseYear: 1999,
  rating: 8.4,
};

function tmdbPage(page = 1, totalPages = 5) {
  return {
    page,
    results: [RAW_MOVIE],
    total_pages: totalPages,
    total_results: 100,
  };
}

function call(query: string) {
  return GET(new Request(`http://localhost/api/explore?${query}`));
}

describe("GET /api/explore", () => {
  it("serves popular movies page 1 when no params are given (RF-1)", async () => {
    let url: URL | undefined;
    server.use(
      http.get(POPULAR_URL, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(tmdbPage());
      })
    );

    const response = await call("");

    expect(response.status).toBe(200);
    expect(url?.searchParams.get("page")).toBe("1");
    expect(await response.json()).toEqual({
      movies: [MAPPED_MOVIE],
      page: 1,
      totalPages: 5,
    });
  });

  it("maps discover params and page to a discover request (RF-2–RF-5)", async () => {
    let url: URL | undefined;
    server.use(
      http.get(DISCOVER_URL, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(tmdbPage(2));
      })
    );

    const response = await call("genre=28&year=1999&sort=popularity.asc&page=2");

    expect(url?.searchParams.get("with_genres")).toBe("28");
    expect(url?.searchParams.get("primary_release_year")).toBe("1999");
    expect(url?.searchParams.get("sort_by")).toBe("popularity.asc");
    expect(url?.searchParams.get("page")).toBe("2");
    expect(await response.json()).toEqual({
      movies: [MAPPED_MOVIE],
      page: 2,
      totalPages: 5,
    });
  });

  it("maps q and page to a search request (RF-6)", async () => {
    let url: URL | undefined;
    server.use(
      http.get(SEARCH_URL, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(tmdbPage(3));
      })
    );

    const response = await call("q=fight+club&page=3");

    expect(url?.searchParams.get("query")).toBe("fight club");
    expect(url?.searchParams.get("page")).toBe("3");
    expect(response.status).toBe(200);
  });

  it("lets search win when q and a discover filter are both present (D16)", async () => {
    const discover = vi.fn(() => HttpResponse.json(tmdbPage()));
    server.use(
      http.get(SEARCH_URL, () => HttpResponse.json(tmdbPage())),
      http.get(DISCOVER_URL, discover)
    );

    await call("q=matrix&genre=28");

    expect(discover).not.toHaveBeenCalled();
  });

  it("falls back to popular for invalid filter params (RF-10)", async () => {
    const popular = vi.fn(() => HttpResponse.json(tmdbPage()));
    server.use(http.get(POPULAR_URL, popular));

    const response = await call("genre=abc&year=1&sort=banana&q=a");

    expect(response.status).toBe(200);
    expect(popular).toHaveBeenCalledTimes(1);
  });

  it("defaults a missing or invalid page to 1", async () => {
    const pages: (string | null)[] = [];
    server.use(
      http.get(POPULAR_URL, ({ request }) => {
        pages.push(new URL(request.url).searchParams.get("page"));
        return HttpResponse.json(tmdbPage());
      })
    );

    await call("");
    await call("page=abc");
    await call("page=0");
    await call("page=-2");
    await call("page=1.5");

    expect(pages).toEqual(["1", "1", "1", "1", "1"]);
  });

  it("returns an empty page as a 200, not an error (RF-13)", async () => {
    server.use(
      http.get(DISCOVER_URL, () =>
        HttpResponse.json({
          page: 1,
          results: [],
          total_pages: 0,
          total_results: 0,
        })
      )
    );

    const response = await call("genre=28");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      movies: [],
      page: 1,
      totalPages: 0,
    });
  });

  it("returns 502 with { reason: 'network' } on a network failure (RF-14)", async () => {
    server.use(http.get(DISCOVER_URL, () => HttpResponse.error()));

    const response = await call("genre=28");

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ reason: "network" });
  });

  it("returns 502 with { reason: 'http', status } on an upstream HTTP error (RF-14)", async () => {
    server.use(
      http.get(SEARCH_URL, () => new HttpResponse(null, { status: 429 }))
    );

    const response = await call("q=matrix");

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ reason: "http", status: 429 });
  });

  it("returns 502 with { reason: 'invalid_response' } on a malformed upstream body (RF-14)", async () => {
    server.use(
      http.get(POPULAR_URL, () => HttpResponse.json({ nonsense: true }))
    );

    const response = await call("");

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ reason: "invalid_response" });
  });

  it("never includes the access token in the response", async () => {
    server.use(
      http.get(POPULAR_URL, () => HttpResponse.json(tmdbPage())),
      http.get(DISCOVER_URL, () => new HttpResponse(null, { status: 500 }))
    );

    const ok = await call("");
    const failed = await call("genre=28");

    expect(await ok.text()).not.toContain("secret-test-value");
    expect(await failed.text()).not.toContain("secret-test-value");
    expect([...ok.headers.values()].join(" ")).not.toContain(
      "secret-test-value"
    );
  });

  it("forwards the request's abort signal upstream (Risk #5)", async () => {
    const upstream = vi.fn(() => HttpResponse.json(tmdbPage()));
    server.use(http.get(DISCOVER_URL, upstream));
    const controller = new AbortController();
    controller.abort();

    const response = await GET(
      new Request("http://localhost/api/explore?genre=28", {
        signal: controller.signal,
      })
    );

    expect(upstream).not.toHaveBeenCalled();
    expect(response.status).toBe(502);
  });
});
