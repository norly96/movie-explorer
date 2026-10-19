import { describe, expect, it } from "vitest";
import { extractReleaseYear, toRating } from "./tmdb-mappers";
import { TMDB_BACKDROP_BASE_URL, toBackdropUrl } from "./tmdb-mappers";

describe("extractReleaseYear", () => {
  it("extracts the year from a valid ISO date", () => {
    expect(extractReleaseYear("1999-10-15")).toBe(1999);
  });

  it("returns null for an empty string", () => {
    expect(extractReleaseYear("")).toBeNull();
  });

  it("returns null for a malformed date string", () => {
    expect(extractReleaseYear("abcd-ef-gh")).toBeNull();
  });
});

describe("toRating", () => {
  it("returns the vote average when there are votes", () => {
    expect(toRating(8.4, 26000)).toBe(8.4);
  });

  it("returns null when there are no votes (unrated)", () => {
    expect(toRating(0, 0)).toBeNull();
  });

  it("returns a real 0.0 average when there are actual votes", () => {
    expect(toRating(0, 3)).toBe(0);
  });
});

describe("toBackdropUrl", () => {
  it("builds the address under TMDB's original size (RF-33)", () => {
    expect(toBackdropUrl("/abc123.jpg")).toBe(
      "https://image.tmdb.org/t/p/original/abc123.jpg"
    );
  });

  it("keeps the base as a constant, so no shared image configuration changes", () => {
    expect(TMDB_BACKDROP_BASE_URL).toBe("https://image.tmdb.org/t/p/original");
  });
});
