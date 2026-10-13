# Plan — Home explorer: filters, search & infinite scroll

Spec: [`specs/explore-filters/spec.md`](./spec.md) (RF-1 to RF-22).
No implementation code below — types and interfaces only.

## Modules

| Module | Responsibility | RF |
|---|---|---|
| `app/page.tsx` (modified) | Server Component. Reads `searchParams`, parses them via `explore-params.ts`, fetches the genre list + the first page of movies in parallel, renders `ExplorerClient` with that as initial data. Passes `genres: []` down if the genre fetch fails, instead of failing the page. | RF-1, RF-9, RF-21 |
| `app/resolve-explore-page.ts` (new) | Pure async function used by `page.tsx`: `searchParams` → `ExploreFilters` → first page + genres (genre failure degrades to `[]`, RF-21). Exists so the server-side decisions are unit-testable (decision #6 of Spec 1: async Server Components can't be rendered with Testing Library). | RF-9, RF-10, RF-21 |
| `app/explore-params.ts` (new) | Pure, shared by server and client: `ExploreFilters` ↔ URL query params. The single place that parses an incoming URL and the single place that serializes filters back into one. | RF-7, RF-8, RF-9, RF-10 |
| `app/Providers.tsx` (new) | `'use client'`. Wraps the app in `QueryClientProvider` with one stable `QueryClient` per request. Rendered from `app/layout.tsx`. | — (infra for RF-2–RF-22) |
| `app/ExplorerClient.tsx` (new) | `'use client'`. Composition root: wires `useExploreMovies`, owns the URL-write side effects (filter change → replace URL → scroll to top), renders `FilterBar`, `SearchInput`, `ClearFiltersButton` and the grid/loading/empty/error states. | RF-5, RF-7, RF-11–RF-20 |
| `services/schemas/genre-schema.ts` (new) | `TmdbGenreListRawSchema`, `Genre`. | RF-2 |
| `services/explore-service.ts` (new) | `getGenres()`, `getDiscoverMovies()`, `getSearchMovies()` — fetch + Zod-validate, reusing `movie-schema.ts`'s `Movie`/`toMovie` (see Decision D4). | RF-2, RF-3, RF-4, RF-5, RF-6, RF-13, RF-14, RF-15, RF-21 |
| `app/api/explore/route.ts` (new) | Route Handler, `GET /api/explore?genre=&year=&sort=&q=&page=`. Server-only proxy (constitution §6): parses the query with `explore-params.ts`, calls `explore-service.ts`, returns `MoviePage` as JSON, forwarding the request's `AbortSignal`. The only entry point the browser uses to reach TMDB (D18). | RF-2–RF-6, RF-11, RF-14 |
| `services/explore-client.ts` (new) | Browser-safe (no `server-only`, no token). `fetchExplorePage(filters, page, signal)` calls `/api/explore`, Zod-validates the JSON (constitution §4) and returns `ServiceResult<MoviePage>`. This is what `useExploreMovies` calls. | RF-11, RF-14, RF-15 |
| `hooks/useExploreMovies.ts` (new) | `useInfiniteQuery`-based hook, fetching through `explore-client.ts` (never `explore-service.ts` directly, D18): first-page status, next-page status, retry, `hasNextPage`. | RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-22 |
| `hooks/useDebouncedValue.ts` (new) | Generic debounce hook, written in-house rather than a new dependency (see D17). | RF-6 |
| `hooks/useInfiniteScrollTrigger.ts` (new) | Wraps `IntersectionObserver` behind a ref + enabled flag. | RF-11, RF-12 |
| `components/GenreFilter.tsx` (new) | `<select>` of genres; hidden when `genres` is empty (RF-21). | RF-2, RF-21 |
| `components/YearFilter.tsx` (new) | `<select>` of years. | RF-3 |
| `components/SortFilter.tsx` (new) | `<select>` of sort options. | RF-4 |
| `components/FilterBar.tsx` (new) | Lays out Genre/Year/Sort + Clear. Presentation only. | RF-2, RF-3, RF-4, RF-17 |
| `components/SearchInput.tsx` (new) | Controlled text field per `design.md`'s `SearchInput` spec, with `SearchIcon`. | RF-6, RF-18 |
| `components/icons/SearchIcon.tsx` (new) | Decorative icon per `design.md`'s icon rules. | RF-6 (visual only) |
| `components/ClearFiltersButton.tsx` (new) | Secondary button, RF-17's clear-all action. | RF-17 |
| `components/InlinePageError.tsx` (new) | Small inline error + retry, bottom of grid. | RF-15 |
| `components/ErrorState.tsx` (modified) | Adds optional `onRetry` callback (button) alongside the existing `retryHref` (link) — see D9. Spec 1/2's existing tests must still pass unmodified. | RF-14 |
| `components/MovieGrid.tsx`, `MovieCard.tsx`, `MovieCardSkeleton.tsx`, `EmptyState.tsx` | Reused unchanged from Spec 1/2. | RF-1, RF-13, RF-16 |
| `package.json` (modified) | Adds `@tanstack/react-query` — already listed in `AGENTS.md`'s approved stack, first spec to actually use it. | infra |
| `vitest.setup.ts` (modified) | Mocks/polyfills `IntersectionObserver`, unavailable in jsdom (Risk #2), so `useInfiniteScrollTrigger`'s tests can run. | RF-11, RF-12 |

## Component tree

```
app/layout.tsx
└─ app/Providers.tsx (QueryClientProvider)
   └─ app/page.tsx  (Server Component: parses searchParams, fetches initial data)
      └─ ExplorerClient  (Client Component: owns state + data fetching)
         ├─ FilterBar
         │  ├─ GenreFilter
         │  ├─ YearFilter
         │  ├─ SortFilter
         │  └─ ClearFiltersButton   (rendered only when a filter/search is active)
         ├─ SearchInput
         └─ [result area, one branch active at a time]
            ├─ MovieCardSkeleton × 20        (RF-16, first load)
            ├─ EmptyState                     (RF-13)
            ├─ ErrorState (onRetry)           (RF-14)
            └─ MovieGrid                      (RF-1/2/3/4/5/6 results)
               ├─ MovieCardSkeleton × few     (RF-16, appended page loading)
               ├─ InlinePageError             (RF-15)
               └─ sentinel div (ref)          (RF-11/RF-12 trigger, invisible)
```

## State & routes

- **Routes**: only `/` (unchanged from Spec 1 — no new segment).
- **Source of truth for filters**: the URL's query string (`?genre=&year=&sort=&q=`), read via `useSearchParams`/`searchParams`. There is no separate client store for it (see D2).
- **Server state**: none held across requests — `page.tsx` parses `searchParams` fresh on every request.
- **Client state**:
  - TanStack Query cache (via `useExploreMovies`), keyed by the serialized `ExploreFilters` + page — ephemeral, rebuilt from the URL on reload.
  - One local `useState` in `ExplorerClient` for the search box's *raw* text (so typing feels instant); the *debounced* value is what actually drives the URL/query (RF-6).
- **No Zustand, no `localStorage`** for this feature (see D2) — nothing here is user data that must persist across visits per constitution §6; it's transient view state fully recoverable from the URL.

## Data model

```ts
// app/explore-params.ts
export type SortOption =
  | "popularity.desc"
  | "popularity.asc"
  | "vote_average.desc"
  | "primary_release_date.desc"
  | "primary_release_date.asc";

export type ExploreFilters =
  | { mode: "popular" }
  | {
      mode: "discover";
      genreId: number | null;
      year: number | null;
      sort: SortOption | null;
    }
  | { mode: "search"; query: string };

// Invalid/unrecognized params are dropped (RF-10); if nothing valid
// remains, or both "q" and a filter are present at once, the result
// collapses to { mode: "popular" } or picks "search" — see D-tiebreak.
export function parseExploreParams(params: URLSearchParams): ExploreFilters;

// The only place that writes the URL — always the full param set,
// never a partial patch (D3).
export function exploreFiltersToSearchParams(
  filters: ExploreFilters
): URLSearchParams;
```

```ts
// services/schemas/genre-schema.ts
export interface Genre {
  id: number;
  name: string;
}
```

```ts
// services/explore-service.ts
// Reuses Movie/toMovie/TmdbPopularResponseRawSchema from movie-schema.ts (D4).
// Reuses ServiceResult<T>/TmdbServiceErrorReason from tmdb-service.ts (D5).
export interface MoviePage {
  movies: Movie[];
  page: number;
  totalPages: number;
}

export function getGenres(): Promise<ServiceResult<Genre[]>>;

// Page N of TMDB `movie/popular`, so infinite scroll also works in
// "popular" mode (RF-1 + RF-11). Page 1 matches Spec 1's list.
export function getPopularMoviesPage(
  page: number,
  signal?: AbortSignal
): Promise<ServiceResult<MoviePage>>;

export function getDiscoverMovies(
  filters: { genreId: number | null; year: number | null; sort: SortOption | null },
  page: number,
  signal?: AbortSignal
): Promise<ServiceResult<MoviePage>>;

export function getSearchMovies(
  query: string,
  page: number,
  signal?: AbortSignal
): Promise<ServiceResult<MoviePage>>;
```

```ts
// app/api/explore/route.ts  (server)
// GET /api/explore?genre=&year=&sort=&q=&page=  ->  200 MoviePage JSON
// Upstream failures map to: network -> 502, http -> 502, invalid_response -> 502
// (the body carries { reason, status? } so the client can rebuild the ServiceResult).
export function GET(request: Request): Promise<Response>;

// services/explore-client.ts  (browser-safe)
export function fetchExplorePage(
  filters: ExploreFilters,
  page: number,
  signal?: AbortSignal
): Promise<ServiceResult<MoviePage>>;
```

```ts
// hooks/useExploreMovies.ts
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

export function useExploreMovies(
  filters: ExploreFilters
): UseExploreMoviesResult;
```

```ts
// hooks/useDebouncedValue.ts
export function useDebouncedValue<T>(value: T, delayMs: number): T;

// hooks/useInfiniteScrollTrigger.ts
export function useInfiniteScrollTrigger(
  onIntersect: () => void,
  enabled: boolean
): React.RefObject<HTMLDivElement>;
```

```ts
// Component props
export interface GenreFilterProps {
  genres: Genre[]; // [] → component renders nothing (RF-21, D14)
  value: number | null;
  onChange: (genreId: number | null) => void;
}

export interface YearFilterProps {
  value: number | null;
  onChange: (year: number | null) => void;
}

export interface SortFilterProps {
  value: SortOption | null;
  onChange: (sort: SortOption | null) => void;
}

export interface SearchInputProps {
  value: string;
  onChange: (query: string) => void;
}

export interface ClearFiltersButtonProps {
  visible: boolean; // D12
  onClear: () => void;
}

export interface InlinePageErrorProps {
  onRetry: () => void;
}

// components/ErrorState.tsx — extended, Spec 1/2's `retryHref` behavior
// is unchanged when `onRetry` is absent.
export interface ErrorStateProps {
  message?: string;
  retryHref?: string;
  onRetry?: () => void; // takes precedence over retryHref when present (D9)
}
```

## Decisions

1. **Composition root is a Client Component** (`app/ExplorerClient.tsx`), not `page.tsx` itself. `page.tsx` stays a thin Server Component: parses `searchParams`, fetches the genre list and the first movie page in parallel, passes both down as initial data. *Rejected*: fetching everything client-side with no SSR — violates constitution §3 and the spec's Data-flow NFR, and would flash an empty skeleton even for the common unfiltered visit.
2. **Filters live only in the URL**, never duplicated into a Zustand store. *Rejected*: a Zustand store mirroring the URL — constitution §6 reserves Zustand for persisted user data; a second source of truth risks drifting from the URL.
3. **One pure module, `app/explore-params.ts`, is the only reader and the only writer of the URL's filter state**, and every write replaces the full param set rather than patching individual keys — prevents a stale leftover param (e.g. `year`) surviving a switch to search mode (RF-7). *Rejected*: letting each filter control patch its own query param independently — simpler per-control, but exactly how stale params would survive a mode switch.
4. **Discover, search and popular responses reuse `movie-schema.ts`'s existing `TmdbPopularResponseRawSchema`/`toMovie`/`Movie`** — TMDB's paginated movie-list shape is identical across the three endpoints. Only `genre/movie/list` gets a new schema. *Rejected*: a parallel, duplicated schema per endpoint — guaranteed drift risk for zero benefit.
5. **`explore-service.ts` reuses `tmdb-service.ts`'s existing `ServiceResult<T>`/`TmdbServiceErrorReason`** rather than redeclaring them. *Rejected*: duplicating an identical type (drift risk); also rejected, for now, extracting both into a new shared `services/service-result.ts` — no second, genuinely *different* error-reason set exists yet to justify that extraction (unlike `movie-detail-service.ts`, which needed its own `"not_found"`).
6. **The year filter is a bounded `<select>` of years**, not a free-text number input. *Rejected*: free-text input — needs its own clamping/validation feedback in the UI, when a `<select>` can't produce an invalid value through the UI at all (RF-10 then only has to handle a hand-edited URL).
7. **The year filter uses TMDB's `primary_release_year` param**, not `year`. *Rejected*: `year` — matches any release_date across all regional releases, which can surface a movie under a year its primary release didn't belong to.
8. **Sorting by rating (`vote_average.desc`) also applies TMDB's `vote_count.gte` threshold**, so a handful of 10/10 votes on an obscure title can't outrank genuinely popular, well-reviewed movies. *Rejected*: sorting by rating with no floor — matches TMDB's raw behavior but produces an unconvincing result list for a portfolio demo.
9. **`ErrorState` gains an optional `onRetry` callback** that renders a `<button>` instead of the existing `<Link retryHref>` when present. Needed because RF-14's retry must re-trigger the client-side query, not navigate. *Rejected*: a second, near-identical `ErrorStateClient` component — would duplicate markup/tokens already built and tested in Spec 1/2 for a one-prop difference.
10. **RF-15's inline, bottom-of-grid error is its own small component**, `InlinePageError`, instead of an `ErrorState` variant. *Rejected*: a `variant="inline"` prop on `ErrorState` — would complicate a component whose Spec 1/2 contract and tests should stay untouched, for a visually unrelated layout.
11. **RF-16's "loading next page" indicator reuses `MovieCardSkeleton`** (a few more rendered at the bottom while fetching) instead of a new spinner component. *Rejected*: a dedicated spinner — needs a new icon not in `design.md`'s initial set, and breaks design.md's own rule that loading states match "the exact size of the final component."
12. **"Clear filters" only renders when a filter/search is active** (RF-17). *Rejected*: always visible but disabled — a permanently visible dead control adds clutter that `design.md`'s minimalism principle explicitly warns against.
13. **Every filter/search/sort change calls `router.replace()`, never `router.push()`** (RF-20), with no exception for "settled" typing. *Rejected*: pushing once typing settles — still pollutes history on every subsequent *different* filter touched afterwards, for marginal benefit.
14. **RF-21's degraded genre control is hidden entirely**, not shown disabled. *Rejected*: visible-but-disabled with an explanatory tooltip — more UI work for a rare, already-degraded case the spec allows resolving silently.
15. **RF-19's scroll-to-top targets a ref placed just above the grid**, not `window.scrollTo(0, 0)`. *Rejected*: scrolling the whole window to the very top — would also scroll the filter bar out of view, when the goal is only to stop showing a new result set at an old scroll depth.
16. **Tie-break when a URL literally contains both `q` and a discover filter param**: `q` wins; the discover params are dropped during parsing. *Rejected*: the discover filters winning instead — RF-7's direction (typing search clears filters, not the reverse) makes search the more "intentional" signal when both are somehow present at once.
17. **The 300ms debounce (RF-6) is a ~10-line in-house hook**, not a new dependency (e.g. `use-debounce`). *Rejected*: pulling in a package for logic this small — constitution §1's "no dependency without a concrete problem" standard isn't met by something this trivial to write and test directly.
18. **The browser never calls TMDB or `explore-service.ts`; it calls our own Route Handler `/api/explore`** via `services/explore-client.ts`. `tmdb-config.ts` is `server-only` and reads `TMDB_ACCESS_TOKEN`, so any service built on it can't run in a Client Component, and exposing the token to the browser is forbidden (AGENTS.md hard rule). A Route Handler that only proxies TMDB is exactly what constitution §6 allows. `page.tsx` still calls `explore-service.ts` directly on the server for the first page (D1). *Rejected*: Server Actions as `queryFn` — they are serialized one at a time and don't take an `AbortSignal`, which defeats cancelling superseded requests (Risk #5). The client re-validates the proxy's JSON with Zod rather than trusting it (constitution §4).

## Risks

1. **TanStack Query + SSR hydration mismatch.** If the client's first render doesn't exactly match the server-rendered HTML, React warns or double-fetches. *Mitigation*: seed `useInfiniteQuery`'s `initialData` directly from the server-fetched first page; create one stable `QueryClient` per request in `Providers.tsx`, never recreated on re-render.
2. **`IntersectionObserver` isn't implemented in jsdom** (Vitest's test environment). *Mitigation*: mock/polyfill it in `vitest.setup.ts` for `useInfiniteScrollTrigger`'s tests.
3. **TMDB's `vote_average.desc` sort surfaces low-vote-count outliers** without a floor. *Mitigation*: D8's `vote_count.gte` threshold.
4. **Mutual-exclusion bugs leaving stale URL params** when switching between discover and search modes. *Mitigation*: D3's "always rewrite the full param set" rule.
5. **Debounced search + infinite scroll racing with a superseded request.** *Mitigation*: TanStack Query's per-query-key cache isolation, plus wiring its `AbortSignal` through `explore-client.ts` → the Route Handler → `fetch()` in `explore-service.ts` so a genuinely stale in-flight request is cancelled, not just ignored.
6. **New dependency (`@tanstack/react-query`) adds client bundle weight.** *Mitigation*: already pre-approved in `AGENTS.md`'s stack list; this is simply the first spec that exercises client interactivity heavy enough to justify installing it (constitution §1 satisfied, not bypassed).
7. **TMDB rate limits during Playwright E2E**, now hit by four endpoints (popular/discover/search/genre-list) instead of one. *Mitigation*: same accepted precedent as Spec 1/2 — keep the E2E suite small and targeted, live API, no mocking at that layer.
8. **Route Handler adds a hop and a new public endpoint.** *Mitigation*: it only accepts params already validated by `explore-params.ts` (invalid ones dropped, `page` clamped to a positive integer), exposes no token, and returns only the mapped `MoviePage`.

## Test strategy

| File | Covers | RF |
|---|---|---|
| `app/explore-params.test.ts` | Parse: valid combos, invalid/malformed params dropped, empty → popular, `q` < 2 chars dropped, whitespace-only `q` dropped (spec.md Edge cases), `q`+filter tie-break (D16). Serialize: full-rewrite behavior. | RF-7, RF-8, RF-9, RF-10 |
| `services/schemas/genre-schema.test.ts` | Valid genre list parses; malformed shape rejected. | RF-2 |
| `services/explore-service.test.ts` (MSW) | `getDiscoverMovies` builds the right query (genre+year+sort combined, `primary_release_year`, `vote_count.gte` when sorting by rating); `getSearchMovies` builds its query; pagination fields mapped; network/HTTP/invalid-shape errors; empty `results` → `ok:true` with `movies: []` (not an error); a passed-in `AbortSignal` is forwarded to `fetch()` (Risk #5). | RF-2, RF-3, RF-4, RF-5, RF-6, RF-13, RF-14, RF-21 |
| `app/api/explore/route.test.ts` (MSW) | Maps each mode (popular/discover/search) + `page` to the right TMDB request; invalid params fall back per RF-10; upstream failure → 502 with `{ reason }`; never includes the token in the response. | RF-2–RF-6, RF-10, RF-14 |
| `services/explore-client.test.ts` (MSW) | Builds the `/api/explore` URL from `ExploreFilters` + page; parses a valid `MoviePage`; maps 502/network/invalid body to `ServiceResult` errors; forwards the `AbortSignal`. | RF-11, RF-14, RF-15 |
| `hooks/useDebouncedValue.test.ts` (fake timers) | No update before 300ms; updates after; timer resets on rapid changes. | RF-6 |
| `hooks/useExploreMovies.test.ts` (MSW + React Query test utils) | First-page success/error; next-page append; next-page failure keeps prior pages + exposes `nextPageError`; `hasNextPage` false after the last page, and also when `total_pages` overstates what `results` actually returns (spec.md Edge cases); `retryNextPage` clears the error and resumes; a response superseded by a newer filter change (while still in flight) is discarded, never applied (Risk #5). | RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-22 |
| `components/GenreFilter.test.tsx`, `YearFilter.test.tsx`, `SortFilter.test.tsx` | Render options; call `onChange`; `GenreFilter` renders nothing when `genres` is `[]` (RF-21). | RF-2, RF-3, RF-4, RF-21 |
| `components/SearchInput.test.tsx` | Visible label (design.md), calls `onChange` per keystroke (debounce is the hook's job). | RF-6, RF-18 |
| `components/ClearFiltersButton.test.tsx` | Hidden when `visible={false}`; calls `onClear`. | RF-17 |
| `components/InlinePageError.test.tsx` | Renders message + retry button; calls `onRetry`. | RF-15 |
| `components/ErrorState.test.tsx` | Existing Spec 1/2 cases pass unmodified; new case: `onRetry` renders a button instead of the link. | RF-14 |
| `app/ExplorerClient.test.tsx` (MSW) | Unlike Spec 1/2's async Server Component composition points, this root is a Client Component and **can** be rendered with Testing Library directly — closes the kind of composition-test gap both previous specs had to accept as tech debt. Covers mutual exclusion (RF-7), scroll-to-top call (RF-19, via a mocked `scrollIntoView`), `router.replace` vs `push` (RF-20, via a mocked `next/navigation`), empty/loading/error branches end to end, and that `YearFilter`/`SortFilter`/`SearchInput` stay operable when `genres=[]` (RF-21). | RF-5, RF-7, RF-13, RF-14, RF-16, RF-19, RF-20, RF-21 |
| `e2e/explore-filters.spec.ts` (Playwright, live TMDB) | Selecting a genre narrows the grid and updates the URL; typing a search query shows matching results and clears filters; scrolling loads another page; reloading a filtered/search URL directly reproduces the same view; an invalid URL param degrades gracefully; clearing returns to popular; applying a filter and then using the browser's real back button returns straight to the unfiltered list in one step (RF-20's actual, unmocked effect). | RF-1, RF-2, RF-6, RF-8, RF-9, RF-10, RF-11, RF-17, RF-20 |

## RF coverage matrix

All of RF-1 through RF-22 are covered above — see the "RF" column of each table. No standalone row is needed beyond what's listed.

## RF not covered

None — every RF in `spec.md` has at least one planned test, satisfying constitution §5.
