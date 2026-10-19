import { describe, expect, it } from "vitest";
import {
  TmdbMovieRawSchema,
  TmdbPopularResponseRawSchema,
  toMovie,
  type TmdbMovieRaw,
} from "./movie-schema";
import { pickFeatured, toFeaturedMovie } from "./movie-schema";

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

describe("TmdbMovieRawSchema: fields used by the featured movie (RF-6)", () => {
  it("still parses a raw movie without them", () => {
    const parsed = TmdbMovieRawSchema.parse(rawMovie());

    expect(parsed.backdrop_path).toBeUndefined();
    expect(parsed.overview).toBeUndefined();
    expect(parsed.genre_ids).toBeUndefined();
  });

  it("accepts a backdrop path, an overview and genre ids", () => {
    const parsed = TmdbMovieRawSchema.parse(
      rawMovie({
        backdrop_path: "/bd.jpg",
        overview: "A story.",
        genre_ids: [18, 53],
      })
    );

    expect(parsed.backdrop_path).toBe("/bd.jpg");
    expect(parsed.overview).toBe("A story.");
    expect(parsed.genre_ids).toEqual([18, 53]);
  });

  it("accepts a null backdrop path", () => {
    expect(() =>
      TmdbMovieRawSchema.parse(rawMovie({ backdrop_path: null }))
    ).not.toThrow();
  });

  it.each([
    ["a numeric backdrop path", { backdrop_path: 5 }],
    ["a numeric overview", { overview: 5 }],
    ["genre ids that are not numbers", { genre_ids: ["drama"] }],
  ])("rejects %s", (_label, extra) => {
    expect(() =>
      TmdbMovieRawSchema.parse({ ...rawMovie(), ...extra })
    ).toThrow();
  });

  it("does not change what toMovie returns for a movie that has them", () => {
    const movie = toMovie(
      rawMovie({ backdrop_path: "/bd.jpg", overview: "A story.", genre_ids: [18] }),
      IMAGE_BASE_URL
    );

    expect(Object.keys(movie).sort()).toEqual(
      ["id", "posterUrl", "rating", "releaseYear", "title"].sort()
    );
  });
});

describe("toFeaturedMovie", () => {
  it("maps a raw movie that has a backdrop (RF-6, RF-33)", () => {
    const featured = toFeaturedMovie({
      ...rawMovie({ overview: "A story.", genre_ids: [18, 53] }),
      backdrop_path: "/bd.jpg",
    });

    expect(featured).toEqual({
      id: 550,
      title: "Fight Club",
      overview: "A story.",
      backdropUrl: "https://image.tmdb.org/t/p/original/bd.jpg",
      genreIds: [18, 53],
      releaseYear: 1999,
      rating: 8.4,
    });
  });

  it("keeps an empty overview empty, so the synopsis can be omitted (RF-16)", () => {
    const featured = toFeaturedMovie({
      ...rawMovie({ overview: "" }),
      backdrop_path: "/bd.jpg",
    });

    expect(featured.overview).toBe("");
  });

  it("treats a missing overview and missing genre ids as empty (RF-16)", () => {
    const featured = toFeaturedMovie({ ...rawMovie(), backdrop_path: "/bd.jpg" });

    expect(featured.overview).toBe("");
    expect(featured.genreIds).toEqual([]);
  });

  it("follows the card's rules for year and rating (RF-16)", () => {
    const featured = toFeaturedMovie({
      ...rawMovie({ release_date: "", vote_average: 0, vote_count: 0 }),
      backdrop_path: "/bd.jpg",
    });

    expect(featured.releaseYear).toBeNull();
    expect(featured.rating).toBeNull();
  });
});

describe("pickFeatured", () => {
  it("returns the first movie that has a backdrop, in order (RF-6)", () => {
    const featured = pickFeatured([
      rawMovie({ id: 1, backdrop_path: null }),
      rawMovie({ id: 2, backdrop_path: "/two.jpg" }),
      rawMovie({ id: 3, backdrop_path: "/three.jpg" }),
    ]);

    expect(featured?.id).toBe(2);
    expect(featured?.backdropUrl).toBe("https://image.tmdb.org/t/p/original/two.jpg");
  });

  it("skips movies with a missing or empty backdrop path", () => {
    const featured = pickFeatured([
      rawMovie({ id: 1 }),
      rawMovie({ id: 2, backdrop_path: "" }),
      rawMovie({ id: 3, backdrop_path: "/three.jpg" }),
    ]);

    expect(featured?.id).toBe(3);
  });

  it("returns undefined when no movie has a backdrop (RF-9)", () => {
    expect(
      pickFeatured([rawMovie({ id: 1 }), rawMovie({ id: 2, backdrop_path: null })])
    ).toBeUndefined();
  });

  it("returns undefined for an empty list (RF-9)", () => {
    expect(pickFeatured([])).toBeUndefined();
  });
});
