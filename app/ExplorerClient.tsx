"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { FilterBar } from "../components/FilterBar";
import { InlinePageError } from "../components/InlinePageError";
import { MovieCardSkeleton } from "../components/MovieCardSkeleton";
import { MovieGrid } from "../components/MovieGrid";
import { SearchInput } from "../components/SearchInput";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import {
  useExploreMovies,
  type ExploreInitialPage,
} from "../hooks/useExploreMovies";
import { useInfiniteScrollTrigger } from "../hooks/useInfiniteScrollTrigger";
import type { Genre } from "../services/schemas/genre-schema";
import {
  MIN_QUERY_LENGTH,
  exploreFiltersToSearchParams,
  parseExploreParams,
  type ExploreFilters,
  type SortOption,
} from "./explore-params";

export interface ExplorerClientProps {
  genres: Genre[]; // [] hides the genre control (RF-21)
  // First page rendered by the server for the URL's filters (D1).
  initial?: ExploreInitialPage;
}

const SEARCH_DEBOUNCE_MS = 300;
const FIRST_PAGE_SKELETONS = 20;
const NEXT_PAGE_SKELETONS = 6;

// Same columns as MovieGrid, so skeletons have the final footprint.
const GRID_CLASS =
  "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6";

type DiscoverFilters = Extract<ExploreFilters, { mode: "discover" }>;

function emptyMessage(filters: ExploreFilters): string | undefined {
  if (filters.mode === "search") {
    return `No movies match "${filters.query}". Try a different title.`;
  }
  if (filters.mode === "discover") {
    return "No movies match these filters. Try changing or clearing them.";
  }
  return undefined;
}

// Composition root (plan.md): the URL is the single source of truth for
// the filters (D2); this component only turns user input into URL
// updates (always router.replace, D13) and renders what
// useExploreMovies returns.
export function ExplorerClient({ genres, initial }: ExplorerClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const paramsString = useSearchParams().toString();
  const urlFilters = useMemo(
    () => parseExploreParams(new URLSearchParams(paramsString)),
    [paramsString]
  );
  const urlQuery = urlFilters.mode === "search" ? urlFilters.query : "";

  // router.replace only updates the URL after the server round trip. The
  // filters just chosen are kept here until it does, so a second change
  // made in between builds on the first instead of on the stale URL (RF-5)
  // and the controls reflect the choice right away.
  const [pending, setPending] = useState<ExploreFilters | null>(null);
  const filters = pending ?? urlFilters;

  const [searchText, setSearchText] = useState(urlQuery);
  const resultsRef = useRef<HTMLDivElement>(null);

  // The param string of the last URL this component wrote itself, so a
  // URL change from outside (browser back/forward, RF-8/RF-9) can be told
  // apart from our own and re-sync the search box without clobbering what
  // the visitor is typing.
  const [writtenParams, setWrittenParams] = useState<string | null>(null);
  const [seenParams, setSeenParams] = useState(paramsString);
  if (seenParams !== paramsString) {
    setSeenParams(paramsString);
    setPending(null);
    if (writtenParams !== paramsString) setSearchText(urlQuery);
  }

  function navigate(next: ExploreFilters) {
    const params = exploreFiltersToSearchParams(next).toString();
    if (params === exploreFiltersToSearchParams(filters).toString()) return;

    setWrittenParams(params);
    setPending(next);
    router.replace(params ? `${pathname}?${params}` : pathname, {
      scroll: false,
    });
    // RF-19: a new result set never starts at the old scroll depth.
    resultsRef.current?.scrollIntoView({ block: "start" });
  }

  // RF-7: setting any filter drops the search query and vice versa.
  function updateDiscover(patch: Partial<Omit<DiscoverFilters, "mode">>) {
    const base: DiscoverFilters =
      filters.mode === "discover"
        ? filters
        : { mode: "discover", genreId: null, year: null, sort: null };
    const next = { ...base, ...patch };
    setSearchText("");
    navigate(
      next.genreId === null && next.year === null && next.sort === null
        ? { mode: "popular" }
        : next
    );
  }

  function clearAll() {
    setSearchText("");
    navigate({ mode: "popular" });
  }

  // RF-6: the URL (and so the request) follows the search box 300ms after
  // the last keystroke. The effect depends only on the debounced text; the
  // latest filters/navigate are read through a ref so that a filter click
  // doesn't re-run it with a stale query.
  const latest = useRef({ filters, navigate });
  useEffect(() => {
    latest.current = { filters, navigate };
  });
  const debouncedText = useDebouncedValue(searchText, SEARCH_DEBOUNCE_MS);
  useEffect(() => {
    const query = debouncedText.trim();
    const { filters: current, navigate: go } = latest.current;

    if (query.length >= MIN_QUERY_LENGTH) {
      if (current.mode !== "search" || current.query !== query) {
        go({ mode: "search", query });
      }
    } else if (current.mode === "search") {
      go({ mode: "popular" }); // cleared back under the minimum
    }
  }, [debouncedText]);

  const explore = useExploreMovies(filters, initial);

  const sentinelRef = useInfiniteScrollTrigger(
    explore.fetchNextPage,
    explore.movies.length > 0 &&
      explore.hasNextPage &&
      !explore.isFetchingNextPage &&
      explore.nextPageError === null
  );

  const discover = filters.mode === "discover" ? filters : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <SearchInput value={searchText} onChange={setSearchText} />
        <FilterBar
          genres={genres}
          genreId={discover?.genreId ?? null}
          year={discover?.year ?? null}
          sort={discover?.sort ?? null}
          clearVisible={filters.mode !== "popular"}
          onGenreChange={(genreId) => updateDiscover({ genreId })}
          onYearChange={(year) => updateDiscover({ year })}
          onSortChange={(sort: SortOption | null) => updateDiscover({ sort })}
          onClear={clearAll}
        />
      </div>

      <div
        ref={resultsRef}
        data-testid="results-anchor"
        className="scroll-mt-4"
      >
        {explore.isFirstLoading ? (
          <div
            role="status"
            aria-label="Loading movies"
            className={GRID_CLASS}
          >
            {Array.from({ length: FIRST_PAGE_SKELETONS }, (_, index) => (
              <MovieCardSkeleton key={index} />
            ))}
          </div>
        ) : explore.firstPageError ? (
          <ErrorState
            message="Couldn't load movies. Check your connection and try again."
            onRetry={explore.retryFirstPage}
          />
        ) : explore.movies.length === 0 ? (
          <EmptyState message={emptyMessage(filters)} />
        ) : (
          <>
            <MovieGrid movies={explore.movies} />
            {explore.isFetchingNextPage && (
              <div
                role="status"
                aria-label="Loading more movies"
                className={`${GRID_CLASS} mt-4 md:mt-6`}
              >
                {Array.from({ length: NEXT_PAGE_SKELETONS }, (_, index) => (
                  <MovieCardSkeleton key={index} />
                ))}
              </div>
            )}
            {explore.nextPageError && (
              <InlinePageError onRetry={explore.retryNextPage} />
            )}
            <div ref={sentinelRef} />
          </>
        )}
      </div>
    </div>
  );
}
