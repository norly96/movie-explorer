import { describe, expect, it } from "vitest";
import type { ExploreFilters } from "./explore-params";
import { resultsHeading } from "./results-heading";

const GENRES = [
  { id: 28, name: "Action" },
  { id: 18, name: "Drama" },
];

function discover(
  patch: Partial<Extract<ExploreFilters, { mode: "discover" }>>
): ExploreFilters {
  return { mode: "discover", genreId: null, year: null, sort: null, ...patch };
}

describe("resultsHeading (RF-21)", () => {
  it('is "Popular movies" for the popular list', () => {
    expect(resultsHeading({ mode: "popular" }, GENRES)).toBe("Popular movies");
  });

  it("names a search with the text between curly quotes", () => {
    expect(resultsHeading({ mode: "search", query: "matrix" }, GENRES)).toBe(
      "Results for “matrix”"
    );
  });

  it("trims the search text", () => {
    expect(resultsHeading({ mode: "search", query: "  matrix  " }, GENRES)).toBe(
      "Results for “matrix”"
    );
  });

  it("names a single genre", () => {
    expect(resultsHeading(discover({ genreId: 18 }), GENRES)).toBe("Drama");
  });

  it("names a single year", () => {
    expect(resultsHeading(discover({ year: 1999 }), GENRES)).toBe("1999");
  });

  it("names a single sort order with its label", () => {
    expect(resultsHeading(discover({ sort: "vote_average.desc" }), GENRES)).toBe(
      "Highest rated"
    );
  });

  it("joins the active filters with a middle dot, in the order genre, year, sort", () => {
    expect(
      resultsHeading(
        discover({ sort: "vote_average.desc", year: 1999, genreId: 18 }),
        GENRES
      )
    ).toBe("Drama · 1999 · Highest rated");
  });

  it("leaves out the filters that are not active", () => {
    expect(
      resultsHeading(discover({ genreId: 28, sort: "popularity.asc" }), GENRES)
    ).toBe("Action · Least popular");
  });

  it("leaves out a genre it cannot name but keeps the others", () => {
    expect(resultsHeading(discover({ genreId: 999, year: 2001 }), GENRES)).toBe(
      "2001"
    );
  });

  it('is "Filtered movies" when a filter is active but no name resolves', () => {
    expect(resultsHeading(discover({ genreId: 999 }), GENRES)).toBe(
      "Filtered movies"
    );
  });

  it('is "Filtered movies" when the genre list failed to load', () => {
    expect(resultsHeading(discover({ genreId: 18 }), [])).toBe("Filtered movies");
  });
});
