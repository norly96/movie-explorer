# Tasks — Home explorer: filters, search & infinite scroll

20 tasks, ordered by dependency. `[P]` = does not depend on any pending
task in its own phase and can be done in parallel with the other `[P]`
tasks in that phase.

## Phase 0 — Foundation

- [x] **T01 [P] — Install TanStack Query + wire QueryClientProvider**
  - Depends on: —
  - Files: `package.json`, `app/Providers.tsx`, `app/layout.tsx` (modified)
  - RF: — (infra prerequisite for RF-5, RF-11–RF-22)
  - Done when: `@tanstack/react-query` is a dependency; `app/Providers.tsx` (`'use client'`) wraps `children` in a `QueryClientProvider` with one `QueryClient` instance per render; `app/layout.tsx` renders it; `pnpm dev` still shows the unchanged Spec 1 popular list (regression check, no visible behavior change yet).

- [x] **T02 [P] — genre-schema.ts**
  - Depends on: —
  - Files: `services/schemas/genre-schema.ts`, `services/schemas/genre-schema.test.ts`
  - RF: RF-2
  - Done when: a valid TMDB `genre/movie/list` response parses into `Genre[]`; a malformed shape is rejected by the schema.

- [x] **T03 [P] — explore-params.ts (parse + serialize)**
  - Depends on: —
  - Files: `app/explore-params.ts`, `app/explore-params.test.ts`
  - RF: RF-7, RF-8, RF-9, RF-10
  - Done when: `parseExploreParams` covers — no params → `{mode:"popular"}`; genre/year/sort combos → `{mode:"discover",...}` with all given together; `q` with 2+ chars → `{mode:"search",...}`; an unrecognized/invalid param (bad year, unknown genre id, unknown sort key, `q` under 2 chars, or `q` that's 2+ characters but entirely whitespace) is dropped, falling back to popular if nothing valid remains; a URL with both `q` and a discover filter resolves to search (tie-break, plan.md D16). `exploreFiltersToSearchParams` always emits the full param set for a given `ExploreFilters`, never a partial one.

## Phase 1 — Independent leaves

- [x] **T04 [P] — useDebouncedValue hook**
  - Depends on: —
  - Files: `hooks/useDebouncedValue.ts`, `hooks/useDebouncedValue.test.ts`
  - RF: RF-6
  - Done when: (fake timers) the returned value doesn't change before 300ms since the last input change; changes after; a new input change before 300ms elapses resets the timer instead of stacking it.

- [x] **T05 [P] — SearchIcon + SearchInput component**
  - Depends on: —
  - Files: `components/icons/SearchIcon.tsx`, `components/SearchInput.tsx`, `components/SearchInput.test.tsx`
  - RF: RF-6, RF-18
  - Done when: renders a visible `<label>` (per `design.md`'s `SearchInput` spec); typing calls `onChange` on every keystroke (debouncing is `useDebouncedValue`'s job, not this component's); `SearchIcon` is `aria-hidden="true"`.

- [x] **T06 [P] — ClearFiltersButton component**
  - Depends on: —
  - Files: `components/ClearFiltersButton.tsx`, `components/ClearFiltersButton.test.tsx`
  - RF: RF-17
  - Done when: renders nothing when `visible={false}`; renders a button calling `onClear` when `visible={true}`.

- [x] **T07 [P] — InlinePageError component**
  - Depends on: —
  - Files: `components/InlinePageError.tsx`, `components/InlinePageError.test.tsx`
  - RF: RF-15
  - Done when: renders an inline error message and a "Try again" control; clicking it calls `onRetry`.

- [x] **T08 [P] — ErrorState: add onRetry**
  - Depends on: —
  - Files: `components/ErrorState.tsx` (modified), `components/ErrorState.test.tsx`
  - RF: RF-14
  - Done when: Spec 1/2's existing `retryHref`-only tests pass unmodified; when `onRetry` is passed, renders a `<button onClick={onRetry}>` instead of the `<Link retryHref>`.

- [x] **T09 [P] — useInfiniteScrollTrigger hook**
  - Depends on: —
  - Files: `hooks/useInfiniteScrollTrigger.ts`, `hooks/useInfiniteScrollTrigger.test.ts`, `vitest.setup.ts` (modified)
  - RF: RF-11, RF-12
  - Done when: `IntersectionObserver` is mocked/polyfilled in `vitest.setup.ts`; the hook calls `onIntersect` when the returned ref's element intersects and `enabled={true}`; does not call it when `enabled={false}`.

## Phase 2 — Filter components

- [x] **T10 [P] — GenreFilter component**
  - Depends on: T02
  - Files: `components/GenreFilter.tsx`, `components/GenreFilter.test.tsx`
  - RF: RF-2, RF-21
  - Done when: renders nothing when `genres` is `[]` (RF-21/plan.md D14); renders a `<select>` with one option per genre when non-empty; calls `onChange` with the selected genre id.

- [x] **T11 [P] — YearFilter component**
  - Depends on: —
  - Files: `components/YearFilter.tsx`, `components/YearFilter.test.tsx`
  - RF: RF-3
  - Done when: renders a bounded `<select>` of years (current year down to a fixed floor); calls `onChange` with the selected year.

- [x] **T12 [P] — SortFilter component**
  - Depends on: T03 (uses the `SortOption` type)
  - Files: `components/SortFilter.tsx`, `components/SortFilter.test.tsx`
  - RF: RF-4
  - Done when: renders all `SortOption` values as options; calls `onChange` with the selected one.

- [x] **T13 — FilterBar component**
  - Depends on: T06, T10, T11, T12
  - Files: `components/FilterBar.tsx`, `components/FilterBar.test.tsx`
  - RF: RF-2, RF-3, RF-4, RF-17
  - Done when: renders `GenreFilter`, `YearFilter`, `SortFilter` and `ClearFiltersButton` together, forwarding each prop correctly (verified by triggering each control's `onChange`/`onClear` through `FilterBar`'s own props).

## Phase 3 — Service layer

- [x] **T14 — explore-service.ts**
  - Depends on: T02
  - Files: `services/explore-service.ts`, `services/explore-service.test.ts`
  - RF: RF-2, RF-3, RF-4, RF-5, RF-6, RF-13, RF-14, RF-21
  - Done when: server-only (reads `TMDB_ACCESS_TOKEN` via `tmdb-config.ts`, same as `tmdb-service.ts`); MSW-backed tests cover — `getPopularMoviesPage`: page N of `movie/popular` maps to `MoviePage`, same error handling; `getGenres`: ok / network / http / invalid-shape. `getDiscoverMovies`: builds a request combining genre + `primary_release_year` + `sort_by` (plan.md D7) when all three are given; adds `vote_count.gte` when sorting by `vote_average.desc` (plan.md D8); maps `page`/`total_pages`; network/http/invalid-shape errors; an empty `results` array still resolves `ok:true` with `movies: []` (not an error — RF-13's data source); both `getDiscoverMovies` and `getSearchMovies` forward a passed-in `AbortSignal` to the underlying `fetch()` call (plan.md Risk #5) — asserted by aborting the signal and checking the request is cancelled. `getSearchMovies`: builds a `query`+`page` request; same error/empty handling.

- [x] **T14a — /api/explore Route Handler**
  - Depends on: T03, T14
  - Files: `app/api/explore/route.ts`, `app/api/explore/route.test.ts`
  - RF: RF-2, RF-3, RF-4, RF-5, RF-6, RF-10, RF-14
  - Done when: MSW-backed tests cover — `GET /api/explore` maps popular/discover/search + `page` to the matching `explore-service` call and returns `MoviePage` JSON; invalid query params fall back to popular (RF-10); a missing/invalid `page` defaults to 1; an upstream network/http/invalid-shape failure returns 502 with `{ reason, status? }`; the response never contains the access token. Plan D18.

- [x] **T14b — explore-client.ts (browser-safe fetcher)**
  - Depends on: T03, T14a
  - Files: `services/explore-client.ts`, `services/explore-client.test.ts`
  - RF: RF-11, RF-14, RF-15
  - Done when: MSW-backed tests cover — `fetchExplorePage` builds the `/api/explore` URL from `ExploreFilters` + page; a valid body resolves `ok:true` as `MoviePage`; a 502 body, network failure or malformed body resolve to the matching `ServiceResult` error; a passed-in `AbortSignal` cancels the request. File has no `server-only` import and no token reference (`no-secret-leak` keeps passing).

## Phase 4 — Hook layer

- [x] **T15 — useExploreMovies hook**
  - Depends on: T01, T14b
  - Files: `hooks/useExploreMovies.ts`, `hooks/useExploreMovies.test.ts`
  - RF: RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-22
  - Done when: MSW-backed tests (mocking `/api/explore`, with React Query's test utilities) cover — first page success and failure (`firstPageError` set, `isFirstLoading` transitions); `fetchNextPage` appends a second page to `movies`; a failing additional-page request keeps the first page's movies in `movies` and sets `nextPageError` (RF-15) instead of clearing anything; `hasNextPage` becomes `false` once TMDB reports no further pages (RF-12), and `fetchNextPage` is a no-op afterwards; `retryNextPage` clears `nextPageError` and successfully appends the retried page, after which `fetchNextPage` resumes working normally (RF-22); a response reporting `total_pages` greater than the current page but returning an empty `results` array for the next page also resolves to `hasNextPage: false`, with no error (spec.md Edge cases — treated the same as RF-12, not as a failure); switching `filters` while a request for the previous filters is still in flight (two different MSW delays) ends with `movies` reflecting only the newer filters — the superseded response is discarded even if it resolves later (plan.md Risk #5).

## Phase 5 — Composition

- [ ] **T16 — app/page.tsx (server rewrite)**
  - Depends on: T03, T14
  - Files: `app/page.tsx` (modified)
  - RF: RF-1, RF-9, RF-21
  - Done when: `pnpm dev` on `/` with no query params still shows the exact Spec 1 popular list (regression); a URL with valid discover or search params server-renders the matching first page of results, visible with JavaScript disabled (manual check, satisfies the Data-flow NFR); typechecks against `PageProps<"/">`; when `getGenres()` fails, `page.tsx` passes `genres: []` to `ExplorerClient` instead of propagating the failure as a page-level error (RF-21) — verified by simulating a failed genre fetch and checking the page still renders normally.

- [ ] **T17 — app/ExplorerClient.tsx (integration)**
  - Depends on: T04, T05, T06, T07, T08, T09, T13, T15, T16
  - Files: `app/ExplorerClient.tsx`, `app/ExplorerClient.test.tsx`
  - RF: RF-5, RF-7, RF-13, RF-14, RF-16, RF-17, RF-18, RF-19, RF-20, RF-21
  - Done when: MSW-backed Testing Library tests cover — setting a filter while a search query is active clears the query and vice versa (RF-7); genre+year+sort combine instead of replacing each other (RF-5); every filter/search/sort change (and Clear) calls a mocked `router.replace` and never `router.push` (RF-20, mocking `next/navigation`); the same changes call a mocked `scrollIntoView` on the results anchor (RF-19); `ClearFiltersButton` is visible only when a filter/search is active (RF-17); empty/loading/first-page-error branches render the right component (RF-13/RF-14/RF-16); when rendered with `genres=[]` (simulating T16's degraded path), `YearFilter`, `SortFilter` and `SearchInput` remain operable while no genre control renders (RF-21).

## Phase 6 — End to end

- [ ] **T18 — E2E suite**
  - Depends on: T16, T17
  - Files: `e2e/explore-filters.spec.ts`
  - RF: RF-1, RF-2, RF-6, RF-8, RF-9, RF-10, RF-11, RF-17, RF-20
  - Done when: `pnpm test:e2e` passes — selecting a genre narrows the grid and updates the URL; typing a known title finds it and clears any active filter; scrolling near the bottom loads another page; opening a filtered/search URL directly (no prior navigation) reproduces the same results (RF-9); opening a URL with an invalid filter param degrades gracefully to the popular list (RF-10); clicking "Clear filters" returns to the popular list (RF-17); starting at `/` with no filters, applying a genre filter and then using the browser's real back navigation (`page.goBack()`) returns straight to the unfiltered popular list in one step, not through an intermediate state (RF-20's real, unmocked effect).
