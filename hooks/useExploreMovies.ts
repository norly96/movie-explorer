import { useInfiniteQuery } from "@tanstack/react-query";
import {
  exploreFiltersToSearchParams,
  type ExploreFilters,
} from "../app/explore-params";
import {
  fetchExplorePage,
  type ExploreMoviePage,
} from "../services/explore-client";
import type { Movie } from "../services/schemas/movie-schema";
import type { TmdbServiceErrorReason } from "../services/tmdb-service";

export interface UseExploreMoviesResult {
  movies: Movie[];
  isFirstLoading: boolean; // RF-16 (first page)
  firstPageError: TmdbServiceErrorReason | null; // RF-14
  isFetchingNextPage: boolean; // RF-16 (additional page)
  nextPageError: TmdbServiceErrorReason | null; // RF-15
  hasNextPage: boolean; // RF-12
  fetchNextPage: () => void; // RF-11
  retryNextPage: () => void; // RF-22
}

// The first page the server already rendered (plan.md D1, Risk #1), so
// the client doesn't flash a skeleton or fetch it again. Only used while
// `filters` still describe the same view; any other filters fetch fresh.
export interface ExploreInitialPage {
  filters: ExploreFilters;
  page: ExploreMoviePage;
}

// TanStack Query reports failures by thrown errors; this carries the
// service's reason through to the hook's result.
class ExplorePageError extends Error {
  constructor(readonly reason: TmdbServiceErrorReason) {
    super(reason);
  }
}

function reasonOf(error: unknown): TmdbServiceErrorReason {
  return error instanceof ExplorePageError ? error.reason : "network";
}

function filtersKey(filters: ExploreFilters): string {
  return exploreFiltersToSearchParams(filters).toString();
}

// Past this age a cached view is refetched when revisited.
const STALE_TIME_MS = 5 * 60 * 1000;

export function useExploreMovies(
  filters: ExploreFilters,
  initial?: ExploreInitialPage
): UseExploreMoviesResult {
  const key = filtersKey(filters);
  const seed =
    initial && filtersKey(initial.filters) === key ? initial.page : undefined;

  const query = useInfiniteQuery({
    // One cache entry per filter state: a response for older filters can
    // never land in the newer filters' entry (Risk #5).
    queryKey: ["explore", filters.mode, key],
    queryFn: async ({ pageParam, signal }) => {
      const result = await fetchExplorePage(filters, pageParam, signal);
      if (!result.ok) throw new ExplorePageError(result.error.reason);
      return result.data;
    },
    initialPageParam: 1,
    // An empty page ends the list even if total_pages says otherwise
    // (spec.md Edge cases), same as the real last page (RF-12).
    getNextPageParam: (lastPage) =>
      lastPage.movies.length > 0 && lastPage.page < lastPage.totalPages
        ? lastPage.page + 1
        : undefined,
    initialData: seed ? { pages: [seed], pageParams: [1] } : undefined,
    staleTime: STALE_TIME_MS,
    // Failures surface as states with a manual retry (RF-14, RF-15), not
    // as silent backoff; and a window refocus must not refetch every
    // page already scrolled through.
    retry: false,
    refetchOnWindowFocus: false,
  });

  const isRetrying = query.isFetchingNextPage;
  const nextPageFailed = query.isFetchNextPageError && !isRetrying;

  const fetchNextPage = () => {
    // No-op once exhausted (RF-12), while a page is loading, and while a
    // failed page awaits retryNextPage — otherwise the scroll sentinel
    // would hammer a failing endpoint.
    if (!query.hasNextPage || query.isFetchingNextPage || query.isFetchNextPageError) {
      return;
    }
    void query.fetchNextPage();
  };

  const retryNextPage = () => {
    if (!query.hasNextPage || query.isFetchingNextPage) return;
    void query.fetchNextPage();
  };

  return {
    movies: query.data?.pages.flatMap((page) => page.movies) ?? [],
    isFirstLoading: query.isPending,
    firstPageError:
      query.isError && !query.data ? reasonOf(query.error) : null,
    isFetchingNextPage: query.isFetchingNextPage,
    nextPageError: nextPageFailed ? reasonOf(query.error) : null,
    hasNextPage: query.hasNextPage,
    fetchNextPage,
    retryNextPage,
  };
}
