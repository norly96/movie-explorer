import { HttpResponse, delay, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../mocks/server";

// explore-service.ts imports tmdb-config.ts, which is guarded with
// "server-only" (see services/tmdb-config.test.ts for why this is
// mocked rather than exercised).
vi.mock("server-only", () => ({}));

const {
  getDiscoverMovies,
  getGenres,
  getPopularMoviesPage,
  getSearchMovies,
  MIN_VOTE_COUNT_FOR_RATING_SORT,
} = await import("./explore-service");

const BASE = "https://api.themoviedb.org/3";
const GENRES_URL = `${BASE}/genre/movie/list`;
const DISCOVER_URL = `${BASE}/discover/movie`;
const SEARCH_URL = `${BASE}/search/movie`;
const POPULAR_URL = `${BASE}/movie/popular`;

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

function moviePage(
  overrides: Partial<{
    page: number;
    results: unknown[];
    total_pages: number;
    total_results: number;
  }> = {}
) {
  return {
    page: 1,
    results: [RAW_MOVIE],
    total_pages: 5,
    total_results: 100,
    ...overrides,
  };
}

const NO_FILTERS = { genreId: null, year: null, sort: null };

beforeEach(() => {
  process.env.TMDB_ACCESS_TOKEN = "test-token";
});

afterEach(() => {
  delete process.env.TMDB_ACCESS_TOKEN;
});

describe("getGenres", () => {
  it("returns ok:true with the genre list (RF-2)", async () => {
    let url: URL | undefined;
    let auth: string | null = null;
    server.use(
      http.get(GENRES_URL, ({ request }) => {
        url = new URL(request.url);
        auth = request.headers.get("Authorization");
        return HttpResponse.json({
          genres: [
            { id: 28, name: "Action" },
            { id: 18, name: "Drama" },
          ],
        });
      })
    );

    const result = await getGenres();

    expect(result).toEqual({
      ok: true,
      data: [
        { id: 28, name: "Action" },
        { id: 18, name: "Drama" },
      ],
    });
    expect(url?.searchParams.get("language")).toBe("en-US");
    expect(auth).toBe("Bearer test-token");
  });

  it("returns reason: network on a network failure (RF-21)", async () => {
    server.use(http.get(GENRES_URL, () => HttpResponse.error()));

    expect(await getGenres()).toEqual({
      ok: false,
      error: { reason: "network" },
    });
  });

  it("returns reason: http with the status on an HTTP error", async () => {
    server.use(http.get(GENRES_URL, () => new HttpResponse(null, { status: 500 })));

    expect(await getGenres()).toEqual({
      ok: false,
      error: { reason: "http", status: 500 },
    });
  });

  it("returns reason: invalid_response for a malformed body", async () => {
    server.use(http.get(GENRES_URL, () => HttpResponse.json({ nonsense: true })));

    expect(await getGenres()).toEqual({
      ok: false,
      error: { reason: "invalid_response" },
    });
  });
});

describe("getDiscoverMovies", () => {
  it("combines genre, primary_release_year and sort_by in one request (RF-2–RF-5)", async () => {
    let url: URL | undefined;
    server.use(
      http.get(DISCOVER_URL, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(moviePage());
      })
    );

    await getDiscoverMovies(
      { genreId: 28, year: 1999, sort: "popularity.asc" },
      1
    );

    expect(url?.searchParams.get("with_genres")).toBe("28");
    expect(url?.searchParams.get("primary_release_year")).toBe("1999");
    expect(url?.searchParams.get("sort_by")).toBe("popularity.asc");
    expect(url?.searchParams.get("language")).toBe("en-US");
    expect(url?.searchParams.get("page")).toBe("1");
    expect(url?.searchParams.has("year")).toBe(false);
    expect(url?.searchParams.has("vote_count.gte")).toBe(false);
  });

  it("omits params for null filters", async () => {
    let url: URL | undefined;
    server.use(
      http.get(DISCOVER_URL, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(moviePage());
      })
    );

    await getDiscoverMovies({ genreId: 18, year: null, sort: null }, 1);

    expect(url?.searchParams.get("with_genres")).toBe("18");
    expect(url?.searchParams.has("primary_release_year")).toBe(false);
    expect(url?.searchParams.has("sort_by")).toBe(false);
  });

  it("adds vote_count.gte when sorting by rating (D8)", async () => {
    let url: URL | undefined;
    server.use(
      http.get(DISCOVER_URL, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(moviePage());
      })
    );

    await getDiscoverMovies(
      { genreId: null, year: null, sort: "vote_average.desc" },
      1
    );

    expect(url?.searchParams.get("sort_by")).toBe("vote_average.desc");
    expect(url?.searchParams.get("vote_count.gte")).toBe(
      String(MIN_VOTE_COUNT_FOR_RATING_SORT)
    );
  });

  it("requests the given page and maps page/totalPages (RF-11)", async () => {
    let url: URL | undefined;
    server.use(
      http.get(DISCOVER_URL, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(moviePage({ page: 3, total_pages: 7 }));
      })
    );

    const result = await getDiscoverMovies(NO_FILTERS, 3);

    expect(url?.searchParams.get("page")).toBe("3");
    expect(result).toEqual({
      ok: true,
      data: { movies: [MAPPED_MOVIE], page: 3, totalPages: 7 },
    });
  });

  it("resolves ok:true with movies: [] for an empty results array (RF-13)", async () => {
    server.use(
      http.get(DISCOVER_URL, () =>
        HttpResponse.json(moviePage({ results: [], total_pages: 0, total_results: 0 }))
      )
    );

    expect(await getDiscoverMovies(NO_FILTERS, 1)).toEqual({
      ok: true,
      data: { movies: [], page: 1, totalPages: 0 },
    });
  });

  it("returns reason: network on a network failure (RF-14)", async () => {
    server.use(http.get(DISCOVER_URL, () => HttpResponse.error()));

    expect(await getDiscoverMovies(NO_FILTERS, 1)).toEqual({
      ok: false,
      error: { reason: "network" },
    });
  });

  it("returns reason: http with the status on an HTTP error (RF-14)", async () => {
    server.use(http.get(DISCOVER_URL, () => new HttpResponse(null, { status: 429 })));

    expect(await getDiscoverMovies(NO_FILTERS, 1)).toEqual({
      ok: false,
      error: { reason: "http", status: 429 },
    });
  });

  it("returns reason: invalid_response for a malformed body (RF-14)", async () => {
    server.use(http.get(DISCOVER_URL, () => HttpResponse.json({ nonsense: true })));

    expect(await getDiscoverMovies(NO_FILTERS, 1)).toEqual({
      ok: false,
      error: { reason: "invalid_response" },
    });
  });

  it("does not send the request when the signal is already aborted (Risk #5)", async () => {
    const handler = vi.fn(() => HttpResponse.json(moviePage()));
    server.use(http.get(DISCOVER_URL, handler));
    const controller = new AbortController();
    controller.abort();

    const result = await getDiscoverMovies(NO_FILTERS, 1, controller.signal);

    expect(result).toEqual({ ok: false, error: { reason: "network" } });
    expect(handler).not.toHaveBeenCalled();
  });

  it("cancels an in-flight request when the signal aborts (Risk #5)", async () => {
    let requestReceived!: () => void;
    const received = new Promise<void>((resolve) => (requestReceived = resolve));
    server.use(
      http.get(DISCOVER_URL, async () => {
        requestReceived();
        await delay("infinite");
        return HttpResponse.json(moviePage());
      })
    );
    const controller = new AbortController();

    const pending = getDiscoverMovies(NO_FILTERS, 1, controller.signal);
    await received;
    controller.abort();

    expect(await pending).toEqual({ ok: false, error: { reason: "network" } });
  });
});

describe("getSearchMovies", () => {
  it("builds a query + page request and maps the page (RF-6)", async () => {
    let url: URL | undefined;
    server.use(
      http.get(SEARCH_URL, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(moviePage({ page: 2, total_pages: 4 }));
      })
    );

    const result = await getSearchMovies("fight club", 2);

    expect(url?.searchParams.get("query")).toBe("fight club");
    expect(url?.searchParams.get("page")).toBe("2");
    expect(url?.searchParams.get("language")).toBe("en-US");
    expect(result).toEqual({
      ok: true,
      data: { movies: [MAPPED_MOVIE], page: 2, totalPages: 4 },
    });
  });

  it("resolves ok:true with movies: [] for an empty results array (RF-13)", async () => {
    server.use(
      http.get(SEARCH_URL, () =>
        HttpResponse.json(moviePage({ results: [], total_pages: 0, total_results: 0 }))
      )
    );

    expect(await getSearchMovies("zzzz", 1)).toEqual({
      ok: true,
      data: { movies: [], page: 1, totalPages: 0 },
    });
  });

  it("returns network / http / invalid_response errors (RF-14)", async () => {
    server.use(http.get(SEARCH_URL, () => HttpResponse.error()));
    expect(await getSearchMovies("fi", 1)).toEqual({
      ok: false,
      error: { reason: "network" },
    });

    server.use(http.get(SEARCH_URL, () => new HttpResponse(null, { status: 503 })));
    expect(await getSearchMovies("fi", 1)).toEqual({
      ok: false,
      error: { reason: "http", status: 503 },
    });

    server.use(http.get(SEARCH_URL, () => HttpResponse.json({ nonsense: true })));
    expect(await getSearchMovies("fi", 1)).toEqual({
      ok: false,
      error: { reason: "invalid_response" },
    });
  });

  it("does not send the request when the signal is already aborted (Risk #5)", async () => {
    const handler = vi.fn(() => HttpResponse.json(moviePage()));
    server.use(http.get(SEARCH_URL, handler));
    const controller = new AbortController();
    controller.abort();

    const result = await getSearchMovies("fight", 1, controller.signal);

    expect(result).toEqual({ ok: false, error: { reason: "network" } });
    expect(handler).not.toHaveBeenCalled();
  });

  it("cancels an in-flight request when the signal aborts (Risk #5)", async () => {
    let requestReceived!: () => void;
    const received = new Promise<void>((resolve) => (requestReceived = resolve));
    server.use(
      http.get(SEARCH_URL, async () => {
        requestReceived();
        await delay("infinite");
        return HttpResponse.json(moviePage());
      })
    );
    const controller = new AbortController();

    const pending = getSearchMovies("fight", 1, controller.signal);
    await received;
    controller.abort();

    expect(await pending).toEqual({ ok: false, error: { reason: "network" } });
  });
});

describe("getPopularMoviesPage", () => {
  it("requests page N of movie/popular and maps the page (RF-1, RF-11)", async () => {
    let url: URL | undefined;
    server.use(
      http.get(POPULAR_URL, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(moviePage({ page: 2, total_pages: 500 }));
      })
    );

    const result = await getPopularMoviesPage(2);

    expect(url?.searchParams.get("page")).toBe("2");
    expect(url?.searchParams.get("language")).toBe("en-US");
    expect(result).toEqual({
      ok: true,
      data: { movies: [MAPPED_MOVIE], page: 2, totalPages: 500 },
    });
  });

  it("returns network / http / invalid_response errors", async () => {
    server.use(http.get(POPULAR_URL, () => HttpResponse.error()));
    expect(await getPopularMoviesPage(1)).toEqual({
      ok: false,
      error: { reason: "network" },
    });

    server.use(http.get(POPULAR_URL, () => new HttpResponse(null, { status: 500 })));
    expect(await getPopularMoviesPage(1)).toEqual({
      ok: false,
      error: { reason: "http", status: 500 },
    });

    server.use(http.get(POPULAR_URL, () => HttpResponse.json({ nonsense: true })));
    expect(await getPopularMoviesPage(1)).toEqual({
      ok: false,
      error: { reason: "invalid_response" },
    });
  });

  it("forwards the AbortSignal (Risk #5)", async () => {
    const handler = vi.fn(() => HttpResponse.json(moviePage()));
    server.use(http.get(POPULAR_URL, handler));
    const controller = new AbortController();
    controller.abort();

    const result = await getPopularMoviesPage(1, controller.signal);

    expect(result).toEqual({ ok: false, error: { reason: "network" } });
    expect(handler).not.toHaveBeenCalled();
  });
});
