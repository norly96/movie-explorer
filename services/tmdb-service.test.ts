import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../mocks/server";

// tmdb-service.ts imports tmdb-config.ts, which is guarded with
// "server-only" (see services/tmdb-config.test.ts for why this is
// mocked rather than exercised).
vi.mock("server-only", () => ({}));

const { getPopularMovies } = await import("./tmdb-service");

const TMDB_POPULAR_URL = "https://api.themoviedb.org/3/movie/popular";

const VALID_RAW_MOVIE = {
  id: 550,
  title: "Fight Club",
  poster_path: "/poster.jpg",
  release_date: "1999-10-15",
  vote_average: 8.4,
  vote_count: 26000,
};

describe("getPopularMovies", () => {
  beforeEach(() => {
    process.env.TMDB_ACCESS_TOKEN = "test-token";
  });

  afterEach(() => {
    delete process.env.TMDB_ACCESS_TOKEN;
  });

  it("returns ok:true with mapped movies for a valid response (RF-1)", async () => {
    server.use(
      http.get(TMDB_POPULAR_URL, () =>
        HttpResponse.json({
          page: 1,
          results: [VALID_RAW_MOVIE],
          total_pages: 1,
          total_results: 1,
        })
      )
    );

    const result = await getPopularMovies();

    expect(result).toEqual({
      ok: true,
      data: [
        {
          id: 550,
          title: "Fight Club",
          posterUrl: "https://image.tmdb.org/t/p/w500/poster.jpg",
          releaseYear: 1999,
          rating: 8.4,
        },
      ],
    });
  });

  it("returns ok:false, reason: invalid_response for a malformed body (RF-5)", async () => {
    server.use(
      http.get(TMDB_POPULAR_URL, () => HttpResponse.json({ nonsense: true }))
    );

    const result = await getPopularMovies();

    expect(result).toEqual({
      ok: false,
      error: { reason: "invalid_response" },
    });
  });

  it("returns ok:false, reason: http with the status for an HTTP error (RF-5)", async () => {
    server.use(
      http.get(TMDB_POPULAR_URL, () => new HttpResponse(null, { status: 401 }))
    );

    const result = await getPopularMovies();

    expect(result).toEqual({ ok: false, error: { reason: "http", status: 401 } });
  });

  it("returns ok:false, reason: network on a network failure (RF-5)", async () => {
    server.use(http.get(TMDB_POPULAR_URL, () => HttpResponse.error()));

    const result = await getPopularMovies();

    expect(result).toEqual({ ok: false, error: { reason: "network" } });
  });
});
