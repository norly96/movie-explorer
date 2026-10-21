"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackToTopButton } from "../components/BackToTopButton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { FeaturedHero } from "../components/FeaturedHero";
import { HeroCurtain } from "../components/HeroCurtain";
import { InlinePageError } from "../components/InlinePageError";
import { MovieCardSkeleton } from "../components/MovieCardSkeleton";
import { MovieGrid } from "../components/MovieGrid";
import { ResultsAnnouncer } from "../components/ResultsAnnouncer";
import { SearchFiltersBar } from "../components/SearchFiltersBar";
import { useBackToTopVisibility } from "../hooks/useBackToTopVisibility";
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
import { firstGenreName } from "./featured-genre";
import { resultsHeading } from "./results-heading";

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
  const barRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // RF-12: set when a visitor's action closes the open hero, and finished once
  // both the navigation it causes and the curtain have ended (see settleScroll).
  const settleRef = useRef<{ curtain: boolean; navigation: boolean } | null>(
    null,
  );
  const backToTopSentinelRef = useRef<HTMLDivElement>(null);

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
    if (settleRef.current) {
      settleRef.current.navigation = true;
      settleScroll();
    }
  }

  // RF-12: the first scroll above runs before the hero has rolled up, so the
  // results end up lower than the top of the visible area. Once both the
  // navigation and the curtain have finished, whichever is later, the same scroll
  // is made once more. With no hero (or a hero that was already closed) nothing
  // is waiting and it never happens.
  function settleScroll() {
    const state = settleRef.current;
    if (!state || !state.curtain || !state.navigation) return;
    settleRef.current = null;
    resultsRef.current?.scrollIntoView({ block: "start" });
  }

  function armSettle() {
    if (heroOpen && heroMovie) {
      settleRef.current = { curtain: false, navigation: false };
    }
  }

  function handleSearchChange(text: string) {
    setSearchText(text);
    // Erasing the field brings the hero back: there is nothing to settle.
    if (text === "") settleRef.current = null;
    else armSettle();
  }

  function handleCurtainSettled() {
    if (settleRef.current) {
      settleRef.current.curtain = true;
      settleScroll();
    }
  }

  // RF-7: setting any filter drops the search query and vice versa.
  function updateDiscover(patch: Partial<Omit<DiscoverFilters, "mode">>) {
    const base: DiscoverFilters =
      filters.mode === "discover"
        ? filters
        : { mode: "discover", genreId: null, year: null, sort: null };
    const next = { ...base, ...patch };
    armSettle();
    setSearchText("");
    navigate(
      next.genreId === null && next.year === null && next.sort === null
        ? { mode: "popular" }
        : next
    );
  }

  function clearAll() {
    settleRef.current = null;
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

  // RF-6, RF-9, RF-11: the hero shows the featured movie of the popular list while
  // the list is the popular one and the search field is empty (any text, even a
  // single space, closes it before the search delay). The movie is remembered once
  // it has arrived, so the hero can roll up instead of vanishing when the filters
  // change; before it has ever arrived (a page opened with filters, or a list
  // without a backdrop) nothing is rendered or reserved for it.
  const [heroMovie, setHeroMovie] = useState(explore.featured);
  if (explore.featured !== null && explore.featured !== heroMovie) {
    setHeroMovie(explore.featured);
  }
  const heroOpen = filters.mode === "popular" && searchText === "";

  // RF-24, RF-25: the button shows once the sentinel below the bar has scrolled
  // past; it scrolls back to the bar and sends focus to the results heading, so
  // a keyboard or screen reader user lands where the results start. The scroll
  // is smooth unless the visitor prefers reduced motion.
  const showBackToTop = useBackToTopVisibility(backToTopSentinelRef);

  function backToTop() {
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    barRef.current?.scrollIntoView({
      block: "start",
      behavior: reduceMotion ? "auto" : "smooth",
    });
    headingRef.current?.focus({ preventScroll: true });
  }

  // RF-21, RF-22: the heading says what is shown, and the same text is announced
  // once a search or filter selection has loaded with results. The empty state
  // already announces itself, and the plain popular list is not a selection.
  const heading = resultsHeading(filters, genres);
  const announcement =
    filters.mode !== "popular" &&
    !explore.isFirstLoading &&
    !explore.firstPageError &&
    explore.movies.length > 0
      ? heading
      : "";

  return (
    <div className="flex flex-col">
      {/* RF-15: the page's only level-one heading, always there for assistive
          technology; the hero's title and the results heading come below it. */}
      <h1 className="sr-only">Browse popular movies</h1>

      {/* The anchor of every scroll to the results (explore-filters RF-19,
          home-redesign RF-12): it holds the bar as well as the results, so a
          scroll to it leaves the bar at the top edge and the results right below,
          and the visitor never loses sight of the field they are typing in. */}
      <div
        ref={resultsRef}
        data-testid="results-anchor"
        className="scroll-mt-4"
      >
        {/* The top of the page: the hero and the bar. The back-to-top button watches
            a marker that spans all of it and goes on for the distance of its token
            below the bar, so it is in view whenever the visitor is nearer the top
            than that, and leaving it is always noticed, even by a jump (a 1px marker
            can be skipped between two frames). */}
        <div className="relative">
          <HeroCurtain
            open={heroOpen}
            focusOnClose={searchInputRef}
            onSettled={handleCurtainSettled}
          >
            {heroMovie && (
              <FeaturedHero
                movie={heroMovie}
                genreName={firstGenreName(heroMovie.genreIds, genres)}
              />
            )}
          </HeroCurtain>

          <div className="mx-auto w-full max-w-7xl px-4 pt-8 lg:px-8">
            <SearchFiltersBar
              barRef={barRef}
              searchInputRef={searchInputRef}
              searchText={searchText}
              onSearchChange={handleSearchChange}
              genres={genres}
              genreId={discover?.genreId ?? null}
              year={discover?.year ?? null}
              sort={discover?.sort ?? null}
              clearVisible={filters.mode !== "popular"}
              onGenreChange={(genreId) => updateDiscover({ genreId })}
              onYearChange={(year) => updateDiscover({ year })}
              onSortChange={(sort: SortOption | null) =>
                updateDiscover({ sort })
              }
              onClear={clearAll}
            />
          </div>

          {/* RF-24: the marker the back-to-top button watches. */}
          <div
            ref={backToTopSentinelRef}
            data-slot="back-to-top-sentinel"
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 -bottom-(--offset-back-to-top) w-px"
          />
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 lg:px-8">
          <h2
            ref={headingRef}
            data-slot="results-heading"
            tabIndex={-1}
            className="mb-4 truncate text-lg font-semibold text-foreground"
          >
            {heading}
          </h2>
          <ResultsAnnouncer text={announcement} />
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

      <BackToTopButton visible={showBackToTop} onActivate={backToTop} />
    </div>
  );
}
