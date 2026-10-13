import { HttpResponse, delay, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../mocks/server";

// The services are server-only. Mocking the config (instead of setting the
// env var) keeps the secret's name out of app/, which
// services/no-secret-leak.test.ts scans.
vi.mock("server-only", () => ({}));
vi.mock("../services/tmdb-config", () => ({
  getTmdbConfig: () => ({
    accessToken: "test-value",
    baseUrl: "https://api.themoviedb.org/3",
    imageBaseUrl: "https://image.tmdb.org/t/p/w500",
  }),
}));

const { resolveExplorePage } = await import("./resolve-explore-page");

const BASE = "https://api.themoviedb.org/3";
const GENRES_URL = `${BASE}/genre/movie/list`;
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

const TMDB_PAGE = {
  page: 1,
  results: [RAW_MOVIE],
  total_pages: 4,
  total_results: 80,
};

const GENRES = [
  { id: 28, name: "Action" },
  { id: 18, name: "Drama" },
];

function serveAll() {
  const calls: { endpoint: string; url: URL }[] = [];
  const record = (endpoint: string, body: unknown) =>
    ({ request }: { request: Request }) => {
      calls.push({ endpoint, url: new URL(request.url) });
      return HttpResponse.json(body as Record<string, unknown>);
    };
  server.use(
    http.get(GENRES_URL, record("genres", { genres: GENRES })),
    http.get(POPULAR_URL, record("popular", TMDB_PAGE)),
    http.get(DISCOVER_URL, record("discover", TMDB_PAGE)),
    http.get(SEARCH_URL, record("search", TMDB_PAGE))
  );
  return calls;
}

const endpoints = (calls: { endpoint: string }[]) =>
  calls.map((call) => call.endpoint).sort();

describe("resolveExplorePage", () => {
  it("resolves the unfiltered popular list for no params (RF-1)", async () => {
    const calls = serveAll();

    const result = await resolveExplorePage({});

    expect(endpoints(calls)).toEqual(["genres", "popular"]);
    expect(result.genres).toEqual(GENRES);
    expect(result.initial).toEqual({
      filters: { mode: "popular" },
      page: { movies: [MAPPED_MOVIE], page: 1, totalPages: 4 },
    });
  });

  it("fetches the matching discover page for valid filter params (RF-9)", async () => {
    const calls = serveAll();

    const result = await resolveExplorePage({
      genre: "18",
      year: "1999",
      sort: "vote_average.desc",
    });

    const discover = calls.find((call) => call.endpoint === "discover");
    expect(discover?.url.searchParams.get("with_genres")).toBe("18");
    expect(discover?.url.searchParams.get("primary_release_year")).toBe("1999");
    expect(discover?.url.searchParams.get("sort_by")).toBe("vote_average.desc");
    expect(discover?.url.searchParams.get("page")).toBe("1");
    expect(endpoints(calls)).toEqual(["discover", "genres"]);
    expect(result.initial?.filters).toEqual({
      mode: "discover",
      genreId: 18,
      year: 1999,
      sort: "vote_average.desc",
    });
    expect(result.initial?.page.movies).toEqual([MAPPED_MOVIE]);
  });

  it("fetches the matching search page for a q param (RF-9)", async () => {
    const calls = serveAll();

    const result = await resolveExplorePage({ q: "fight club" });

    const search = calls.find((call) => call.endpoint === "search");
    expect(search?.url.searchParams.get("query")).toBe("fight club");
    expect(search?.url.searchParams.get("page")).toBe("1");
    expect(endpoints(calls)).toEqual(["genres", "search"]);
    expect(result.initial?.filters).toEqual({
      mode: "search",
      query: "fight club",
    });
  });

  it("drops invalid params and falls back to popular, never an error (RF-10)", async () => {
    const calls = serveAll();

    const result = await resolveExplorePage({
      genre: "abc",
      year: "99",
      sort: "banana",
      q: "a",
      foo: "bar",
    });

    expect(endpoints(calls)).toEqual(["genres", "popular"]);
    expect(result.initial?.filters).toEqual({ mode: "popular" });
  });

  it("keeps the valid params and drops only the invalid ones (RF-10)", async () => {
    const calls = serveAll();

    const result = await resolveExplorePage({ genre: "28", year: "abc" });

    expect(endpoints(calls)).toEqual(["discover", "genres"]);
    expect(result.initial?.filters).toEqual({
      mode: "discover",
      genreId: 28,
      year: null,
      sort: null,
    });
  });

  it("lets search win when q and a filter are both present (D16)", async () => {
    const calls = serveAll();

    const result = await resolveExplorePage({ q: "matrix", genre: "28" });

    expect(endpoints(calls)).toEqual(["genres", "search"]);
    expect(result.initial?.filters).toEqual({ mode: "search", query: "matrix" });
  });

  it("uses the first value when a param is repeated", async () => {
    serveAll();

    const result = await resolveExplorePage({ genre: ["18", "28"] });

    expect(result.initial?.filters).toMatchObject({ genreId: 18 });
  });

  it("degrades to genres: [] when the genre list fails, keeping the page (RF-21)", async () => {
    const calls = serveAll();
    server.use(http.get(GENRES_URL, () => HttpResponse.error()));

    const result = await resolveExplorePage({ genre: "18" });

    expect(result.genres).toEqual([]);
    expect(result.initial?.page.movies).toEqual([MAPPED_MOVIE]);
    expect(calls.some((call) => call.endpoint === "discover")).toBe(true);
  });

  it("also degrades on an HTTP or malformed genre response (RF-21)", async () => {
    serveAll();
    server.use(http.get(GENRES_URL, () => new HttpResponse(null, { status: 500 })));
    expect((await resolveExplorePage({})).genres).toEqual([]);

    server.use(http.get(GENRES_URL, () => HttpResponse.json({ nonsense: true })));
    expect((await resolveExplorePage({})).genres).toEqual([]);
  });

  it("leaves initial undefined when the first page fails, so the client fetches it itself", async () => {
    serveAll();
    server.use(http.get(POPULAR_URL, () => new HttpResponse(null, { status: 500 })));

    const result = await resolveExplorePage({});

    expect(result.initial).toBeUndefined();
    expect(result.genres).toEqual(GENRES);
  });

  it("does not throw when both the genre list and the first page fail", async () => {
    server.use(
      http.get(GENRES_URL, () => HttpResponse.error()),
      http.get(POPULAR_URL, () => HttpResponse.error())
    );

    const result = await resolveExplorePage({});

    expect(result).toEqual({ genres: [], initial: undefined });
  });

  it("requests the genre list and the first page in parallel", async () => {
    let genresDone = false;
    let genresDoneWhenPageRequested: boolean | undefined;
    server.use(
      http.get(GENRES_URL, async () => {
        await delay(80);
        genresDone = true;
        return HttpResponse.json({ genres: GENRES });
      }),
      http.get(POPULAR_URL, () => {
        genresDoneWhenPageRequested = genresDone;
        return HttpResponse.json(TMDB_PAGE);
      })
    );

    await resolveExplorePage({});

    expect(genresDoneWhenPageRequested).toBe(false);
  });
});
