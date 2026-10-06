import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../mocks/server";

vi.mock("server-only", () => ({}));

const { getMovieDetails } = await import("./movie-detail-service");

const TMDB_MOVIE_URL = "https://api.themoviedb.org/3/movie/550";

function rawMovieDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: 550,
    title: "Fight Club",
    original_title: "Fight Club",
    tagline: "Mischief. Mayhem. Soap.",
    overview: "An insomniac office worker...",
    poster_path: "/poster.jpg",
    backdrop_path: "/backdrop.jpg",
    release_date: "1999-10-15",
    runtime: 139,
    genres: [{ id: 18, name: "Drama" }],
    vote_average: 8.4,
    vote_count: 26000,
    status: "Released",
    original_language: "en",
    homepage: "https://example.com/fight-club",
    credits: {
      cast: [
        {
          id: 1,
          name: "Brad Pitt",
          character: "Tyler Durden",
          profile_path: null,
          order: 0,
        },
      ],
      crew: [
        { id: 2, name: "David Fincher", job: "Director", profile_path: null },
      ],
    },
    videos: {
      results: [
        {
          key: "abc123",
          site: "YouTube",
          type: "Trailer",
          official: true,
          name: "Official Trailer",
        },
      ],
    },
    images: { backdrops: [] },
    ...overrides,
  };
}

describe("getMovieDetails", () => {
  beforeEach(() => {
    process.env.TMDB_ACCESS_TOKEN = "test-token";
  });

  afterEach(() => {
    delete process.env.TMDB_ACCESS_TOKEN;
  });

  it("returns ok:true with mapped movie details for a valid response (RF-1)", async () => {
    server.use(
      http.get(TMDB_MOVIE_URL, () => HttpResponse.json(rawMovieDetail()))
    );

    const result = await getMovieDetails(550);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.title).toBe("Fight Club");
      expect(result.data.trailerKey).toBe("abc123");
    }
  });

  it("returns ok:false, reason: not_found for a 404 (RF-9)", async () => {
    server.use(
      http.get(TMDB_MOVIE_URL, () => new HttpResponse(null, { status: 404 }))
    );

    const result = await getMovieDetails(550);

    expect(result).toEqual({ ok: false, error: { reason: "not_found" } });
  });

  it("returns ok:false, reason: http with the status for a non-404 HTTP error (RF-10)", async () => {
    server.use(
      http.get(TMDB_MOVIE_URL, () => new HttpResponse(null, { status: 500 }))
    );

    const result = await getMovieDetails(550);

    expect(result).toEqual({ ok: false, error: { reason: "http", status: 500 } });
  });

  it("returns ok:false, reason: network on a network failure (RF-10)", async () => {
    server.use(http.get(TMDB_MOVIE_URL, () => HttpResponse.error()));

    const result = await getMovieDetails(550);

    expect(result).toEqual({ ok: false, error: { reason: "network" } });
  });

  it("returns ok:false, reason: invalid_response for a malformed body (RF-10)", async () => {
    server.use(
      http.get(TMDB_MOVIE_URL, () => HttpResponse.json({ nonsense: true }))
    );

    const result = await getMovieDetails(550);

    expect(result).toEqual({
      ok: false,
      error: { reason: "invalid_response" },
    });
  });

  it("falls back to a language-unfiltered request when en-US has no qualifying trailer, validating it through the same schema (RF-4)", async () => {
    server.use(
      http.get(TMDB_MOVIE_URL, ({ request }) => {
        const language = new URL(request.url).searchParams.get("language");
        if (language === "en-US") {
          // Primary request: no qualifying trailer.
          return HttpResponse.json(rawMovieDetail({ videos: { results: [] } }));
        }
        // Fallback request (no language param): has one.
        return HttpResponse.json(
          rawMovieDetail({
            videos: {
              results: [
                {
                  key: "fallback-key",
                  site: "YouTube",
                  type: "Trailer",
                  official: true,
                  name: "Trailer (dubbed)",
                },
              ],
            },
          })
        );
      })
    );

    const result = await getMovieDetails(550);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.trailerKey).toBe("fallback-key");
    }
  });

  it("keeps trailerKey: null if the fallback also returns malformed data, without failing the whole request", async () => {
    server.use(
      http.get(TMDB_MOVIE_URL, ({ request }) => {
        const language = new URL(request.url).searchParams.get("language");
        if (language === "en-US") {
          return HttpResponse.json(rawMovieDetail({ videos: { results: [] } }));
        }
        return HttpResponse.json({ nonsense: true });
      })
    );

    const result = await getMovieDetails(550);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.trailerKey).toBeNull();
    }
  });
});
