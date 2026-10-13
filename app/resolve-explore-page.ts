import type { ExploreInitialPage } from "../hooks/useExploreMovies";
import {
  getDiscoverMovies,
  getGenres,
  getPopularMoviesPage,
  getSearchMovies,
} from "../services/explore-service";
import type { Genre } from "../services/schemas/genre-schema";
import { parseExploreParams, type ExploreFilters } from "./explore-params";

export interface ResolvedExplorePage {
  genres: Genre[]; // [] when the genre list failed (RF-21)
  // Undefined when the first page failed: the client then fetches it
  // itself and shows its own loading/error states (RF-14).
  initial: ExploreInitialPage | undefined;
}

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function toURLSearchParams(record: SearchParamsRecord): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) params.set(key, first);
  }
  return params;
}

function getFirstPage(filters: ExploreFilters) {
  switch (filters.mode) {
    case "search":
      return getSearchMovies(filters.query, 1);
    case "discover":
      return getDiscoverMovies(filters, 1);
    case "popular":
      return getPopularMoviesPage(1);
  }
}

// Pure of Next.js specifics so the server-side decisions are unit-testable
// (async Server Components can't be rendered with Testing Library).
// Invalid params degrade to the popular list (RF-10) and a failed genre
// list to `genres: []` (RF-21); neither makes the page fail.
export async function resolveExplorePage(
  searchParams: SearchParamsRecord
): Promise<ResolvedExplorePage> {
  const filters = parseExploreParams(toURLSearchParams(searchParams));

  const [genresResult, pageResult] = await Promise.all([
    getGenres(),
    getFirstPage(filters),
  ]);

  return {
    genres: genresResult.ok ? genresResult.data : [],
    initial: pageResult.ok ? { filters, page: pageResult.data } : undefined,
  };
}
