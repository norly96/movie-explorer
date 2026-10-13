export const SORT_OPTIONS = [
  "popularity.desc",
  "popularity.asc",
  "vote_average.desc",
  "primary_release_date.desc",
  "primary_release_date.asc",
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

export type ExploreFilters =
  | { mode: "popular" }
  | {
      mode: "discover";
      genreId: number | null;
      year: number | null;
      sort: SortOption | null;
    }
  | { mode: "search"; query: string };

export const MIN_YEAR = 1900;
export const MIN_QUERY_LENGTH = 2;

// Next year is allowed so announced, not-yet-released movies can be found.
export function getMaxYear(): number {
  return new Date().getFullYear() + 1;
}

// Only the shape is validated: whether a genre id exists is TMDB's call
// (an unknown id simply yields the empty state, RF-13).
function parseGenreId(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
}

function parseYear(value: string | null): number | null {
  if (value === null || !/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  return year >= MIN_YEAR && year <= getMaxYear() ? year : null;
}

function parseSort(value: string | null): SortOption | null {
  return SORT_OPTIONS.find((option) => option === value) ?? null;
}

function parseQuery(value: string | null): string | null {
  const query = value?.trim() ?? "";
  return query.length >= MIN_QUERY_LENGTH ? query : null;
}

export function parseExploreParams(params: URLSearchParams): ExploreFilters {
  // D16: when both are present, search wins.
  const query = parseQuery(params.get("q"));
  if (query !== null) return { mode: "search", query };

  const genreId = parseGenreId(params.get("genre"));
  const year = parseYear(params.get("year"));
  const sort = parseSort(params.get("sort"));

  if (genreId === null && year === null && sort === null) {
    return { mode: "popular" };
  }
  return { mode: "discover", genreId, year, sort };
}

// The only place that writes the URL's filter state. Always the full set
// for the given filters, never a patch (D3), so no stale param survives a
// mode switch (RF-7).
export function exploreFiltersToSearchParams(
  filters: ExploreFilters
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.mode === "search") {
    params.set("q", filters.query);
  } else if (filters.mode === "discover") {
    if (filters.genreId !== null) params.set("genre", String(filters.genreId));
    if (filters.year !== null) params.set("year", String(filters.year));
    if (filters.sort !== null) params.set("sort", filters.sort);
  }

  return params;
}
