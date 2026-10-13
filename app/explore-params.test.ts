import { describe, expect, it } from "vitest";
import {
  exploreFiltersToSearchParams,
  parseExploreParams,
  type ExploreFilters,
} from "./explore-params";

function parse(query: string): ExploreFilters {
  return parseExploreParams(new URLSearchParams(query));
}

const nextYear = new Date().getFullYear() + 1;

describe("parseExploreParams", () => {
  it("returns popular when there are no params (RF-1)", () => {
    expect(parse("")).toEqual({ mode: "popular" });
  });

  it("parses genre, year and sort together into discover mode (RF-5, RF-9)", () => {
    expect(parse("genre=28&year=1999&sort=vote_average.desc")).toEqual({
      mode: "discover",
      genreId: 28,
      year: 1999,
      sort: "vote_average.desc",
    });
  });

  it("parses a single filter and leaves the others null", () => {
    expect(parse("genre=18")).toEqual({
      mode: "discover",
      genreId: 18,
      year: null,
      sort: null,
    });
    expect(parse("year=2010")).toEqual({
      mode: "discover",
      genreId: null,
      year: 2010,
      sort: null,
    });
    expect(parse("sort=popularity.asc")).toEqual({
      mode: "discover",
      genreId: null,
      year: null,
      sort: "popularity.asc",
    });
  });

  it("accepts every supported sort option", () => {
    for (const sort of [
      "popularity.desc",
      "popularity.asc",
      "vote_average.desc",
      "primary_release_date.desc",
      "primary_release_date.asc",
    ]) {
      expect(parse(`sort=${sort}`)).toMatchObject({ mode: "discover", sort });
    }
  });

  it("parses q with 2+ characters into search mode (RF-6)", () => {
    expect(parse("q=fi")).toEqual({ mode: "search", query: "fi" });
    expect(parse("q=fight+club")).toEqual({
      mode: "search",
      query: "fight club",
    });
  });

  it("trims surrounding whitespace from the search query", () => {
    expect(parse("q=%20%20matrix%20")).toEqual({
      mode: "search",
      query: "matrix",
    });
  });

  describe("invalid params are dropped (RF-10)", () => {
    it("drops a non-numeric or non-positive genre id", () => {
      expect(parse("genre=abc")).toEqual({ mode: "popular" });
      expect(parse("genre=-3")).toEqual({ mode: "popular" });
      expect(parse("genre=0")).toEqual({ mode: "popular" });
      expect(parse("genre=1.5")).toEqual({ mode: "popular" });
      expect(parse("genre=")).toEqual({ mode: "popular" });
    });

    it("drops a bad year", () => {
      expect(parse("year=abc")).toEqual({ mode: "popular" });
      expect(parse("year=99")).toEqual({ mode: "popular" });
      expect(parse("year=1899")).toEqual({ mode: "popular" });
      expect(parse(`year=${nextYear + 1}`)).toEqual({ mode: "popular" });
      expect(parse("year=1999.5")).toEqual({ mode: "popular" });
    });

    it("accepts the year bounds: 1900 up to next year", () => {
      expect(parse("year=1900")).toMatchObject({ year: 1900 });
      expect(parse(`year=${nextYear}`)).toMatchObject({ year: nextYear });
    });

    it("drops an unknown sort key", () => {
      expect(parse("sort=banana")).toEqual({ mode: "popular" });
    });

    it("drops q under 2 characters", () => {
      expect(parse("q=a")).toEqual({ mode: "popular" });
      expect(parse("q=")).toEqual({ mode: "popular" });
    });

    it("drops a q of 2+ characters that is entirely whitespace", () => {
      expect(parse("q=%20%20%20")).toEqual({ mode: "popular" });
    });

    it("drops a q that is under 2 characters once trimmed", () => {
      expect(parse("q=%20a%20")).toEqual({ mode: "popular" });
    });

    it("ignores unrecognized params", () => {
      expect(parse("foo=bar")).toEqual({ mode: "popular" });
    });

    it("keeps the valid params and drops only the invalid ones", () => {
      expect(parse("genre=28&year=abc&sort=banana")).toEqual({
        mode: "discover",
        genreId: 28,
        year: null,
        sort: null,
      });
    });

    it("falls back to popular when nothing valid remains", () => {
      expect(parse("genre=x&year=y&sort=z&q=a&foo=bar")).toEqual({
        mode: "popular",
      });
    });
  });

  it("resolves to search when q and a discover filter are both present (D16)", () => {
    expect(parse("q=matrix&genre=28&year=1999&sort=popularity.desc")).toEqual({
      mode: "search",
      query: "matrix",
    });
  });

  it("keeps the discover filters when q is present but invalid", () => {
    expect(parse("q=a&genre=28")).toEqual({
      mode: "discover",
      genreId: 28,
      year: null,
      sort: null,
    });
  });
});

describe("exploreFiltersToSearchParams", () => {
  it("emits no params for popular", () => {
    expect(exploreFiltersToSearchParams({ mode: "popular" }).toString()).toBe(
      ""
    );
  });

  it("emits the full discover set", () => {
    const params = exploreFiltersToSearchParams({
      mode: "discover",
      genreId: 28,
      year: 1999,
      sort: "vote_average.desc",
    });

    expect(params.toString()).toBe("genre=28&year=1999&sort=vote_average.desc");
  });

  it("omits discover fields that are null", () => {
    const params = exploreFiltersToSearchParams({
      mode: "discover",
      genreId: null,
      year: 2010,
      sort: null,
    });

    expect(params.toString()).toBe("year=2010");
  });

  it("emits only q for search, never leftover discover params (RF-7)", () => {
    const params = exploreFiltersToSearchParams({
      mode: "search",
      query: "fight club",
    });

    expect(params.toString()).toBe("q=fight+club");
    expect(params.has("genre")).toBe(false);
    expect(params.has("year")).toBe(false);
    expect(params.has("sort")).toBe(false);
  });

  it("round-trips through parseExploreParams (RF-8, RF-9)", () => {
    const filters: ExploreFilters[] = [
      { mode: "popular" },
      { mode: "discover", genreId: 28, year: 1999, sort: "popularity.asc" },
      { mode: "discover", genreId: null, year: 2020, sort: null },
      { mode: "search", query: "the matrix" },
    ];

    for (const f of filters) {
      expect(parseExploreParams(exploreFiltersToSearchParams(f))).toEqual(f);
    }
  });
});
