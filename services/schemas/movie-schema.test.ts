import { describe, expect, it } from "vitest";
import {
  TmdbMovieRawSchema,
  TmdbPopularResponseRawSchema,
  toMovie,
  type TmdbMovieRaw,
} from "./movie-schema";

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

function rawMovie(overrides: Partial<TmdbMovieRaw> = {}): TmdbMovieRaw {
  return {
    id: 550,
    title: "Fight Club",
    poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    release_date: "1999-10-15",
    vote_average: 8.4,
    vote_count: 26000,
    ...overrides,
  };
}

describe("TmdbMovieRawSchema", () => {
  it("parses a valid raw movie", () => {
    expect(() => TmdbMovieRawSchema.parse(rawMovie())).not.toThrow();
  });
});

describe("TmdbPopularResponseRawSchema", () => {
  it("parses a valid popular-movies response", () => {
    const response = {
      page: 1,
      results: [rawMovie()],
      total_pages: 42,
      total_results: 840,
    };

    expect(() => TmdbPopularResponseRawSchema.parse(response)).not.toThrow();
  });
});

describe("toMovie", () => {
  it("maps a valid raw movie to the domain Movie shape", () => {
    const movie = toMovie(rawMovie(), IMAGE_BASE_URL);

    expect(movie).toEqual({
      id: 550,
      title: "Fight Club",
      posterUrl: `${IMAGE_BASE_URL}/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg`,
      releaseYear: 1999,
      rating: 8.4,
    });
  });

  it("maps a missing poster to posterUrl: null (RF-2)", () => {
    const movie = toMovie(rawMovie({ poster_path: null }), IMAGE_BASE_URL);
    expect(movie.posterUrl).toBeNull();
  });

  it("maps an empty release_date to releaseYear: null (RF-3)", () => {
    const movie = toMovie(rawMovie({ release_date: "" }), IMAGE_BASE_URL);
    expect(movie.releaseYear).toBeNull();
  });

  it("maps vote_count: 0 to rating: null (unrated)", () => {
    const movie = toMovie(
      rawMovie({ vote_average: 0, vote_count: 0 }),
      IMAGE_BASE_URL
    );
    expect(movie.rating).toBeNull();
  });

  it("maps vote_count > 0 to a numeric rating, even a real 0.0", () => {
    const movie = toMovie(
      rawMovie({ vote_average: 0, vote_count: 3 }),
      IMAGE_BASE_URL
    );
    expect(movie.rating).toBe(0);
  });
});
