# Home explorer — filters, search & infinite scroll

## Context and goal
Today the home page only shows one fixed list: TMDB's current popular
movies (Spec 1), one page, no way to narrow it down. This spec turns
that same page into an explorer: genre, release year and sort filters
backed by TMDB `GET /discover/movie`, a text search backed by
TMDB `GET /search/movie`, infinite scroll, and the whole state synced
to the URL so a filtered view is shareable and bookmarkable. The goal
is letting a visitor who already has something specific in mind (a
genre, an era, a title) get there, not just more content to scroll
through aimlessly. With no filter or search active, the page behaves
exactly as Spec 1 already does — popular movies, page 1.

## Users / actors
Visitor (unauthenticated) — same actor as Spec 1 and Spec 2.

## User stories
- H1: As a visitor, I want to narrow the list by genre, year and sort
  order together, so I can find movies that match what I feel like
  watching.
- H2: As a visitor, I want to search movies by title, so I can jump
  straight to one I already have in mind.
- H3: As a visitor, I want to keep scrolling to see more results
  instead of clicking through pages, so browsing feels continuous.
- H4: As a visitor, I want to copy the page's URL while filtering or
  searching and get the same results back, so I can share or bookmark
  a specific view.

## Functional requirements (EARS)
- RF-1: WHEN the visitor opens `/` with no filter or search query
  active, THE SYSTEM renders the popular movies list exactly as
  defined in Spec 1 (unchanged default).
- RF-2: WHEN the visitor selects a genre, THE SYSTEM requests TMDB
  `discover/movie` filtered by that genre and renders the matching
  movies instead of the popular list. Genre options come from TMDB's
  own genre list (`genre/movie/list`), never hardcoded.
- RF-3: WHEN the visitor selects a release year, THE SYSTEM requests
  `discover/movie` filtered by that year.
- RF-4: WHEN the visitor selects a sort order (e.g. popularity,
  rating, release date), THE SYSTEM requests `discover/movie` sorted
  accordingly.
- RF-5: WHEN genre, year and/or sort are active at the same time, THE
  SYSTEM combines all of them into a single `discover/movie` request
  (logical AND) — the main flow is iterative: the visitor adjusts one
  filter at a time without losing the others already set.
- RF-6: WHEN the visitor types 2 or more characters into the search
  field, THE SYSTEM waits 300ms after the last keystroke and then
  requests TMDB `search/movie` for that title, rendering the matching
  movies instead of the discover/popular list.
- RF-7: WHEN a search query is active and the visitor sets a genre,
  year or sort filter, THE SYSTEM clears the search query and switches
  to discover mode — and vice versa: typing a search query while any
  filter is active clears all of those filters first. Search and
  discover filters are mutually exclusive, never combined in one
  request.
- RF-8: WHEN the visitor changes genre, year, sort or search, THE
  SYSTEM reflects the resulting state in the URL's query params, so
  the exact view can be shared or bookmarked.
- RF-9: WHEN the visitor opens a URL that already has valid filter or
  search params, THE SYSTEM applies them on first render, without
  requiring any interaction.
- RF-10: IF the URL contains a param THE SYSTEM doesn't recognize or
  whose value is invalid (e.g. a non-numeric year, an unknown genre id,
  a sort key, or a `q` shorter than RF-6's 2-character minimum), THEN
  THE SYSTEM ignores that specific param and keeps the rest; if none
  remain valid, THE SYSTEM falls back to the default popular list
  (RF-1) — never an error for a bad URL.
- RF-11: WHEN the visitor scrolls near the bottom of the results and
  TMDB reports more pages are available, THE SYSTEM automatically
  loads and appends the next page, preserving the active filter,
  sort or search state.
- RF-12: WHEN TMDB reports no further pages for the active
  filter/search state, THE SYSTEM stops trying to load more on
  scroll — no further requests fire, no indefinite loading indicator,
  no error.
- RF-13: IF the active filters or search query yield zero results on
  the first page, THEN THE SYSTEM shows an empty-state message
  referencing what's active (e.g. the search term), instead of an
  empty grid.
- RF-14: IF the request for the first page of a new filter/search/sort
  selection fails (network error, HTTP error, or an invalid response
  shape), THEN THE SYSTEM shows a full error state with a retry
  action, and does not crash.
- RF-15: IF the request for an additional page fails during infinite
  scroll, THEN THE SYSTEM keeps every already-rendered result visible
  and shows an inline error with a retry action at the bottom of the
  grid, instead of replacing what's already loaded.
- RF-16: WHILE the first page of a new filter/search/sort selection is
  loading, THE SYSTEM shows a loading state (skeleton); WHILE a
  further page is loading via infinite scroll, THE SYSTEM shows an
  inline loading indicator at the bottom instead of replacing the
  already-rendered results.
- RF-17: THE SYSTEM provides a visible control that clears every
  active filter and search query in one action, returning to the
  default popular list.
- RF-18: THE SYSTEM makes every filter control, the search field and
  the clear-filters control reachable and operable via keyboard, with
  a visible focus indicator. Infinite scroll itself (RF-11) relies on
  the browser's native scroll, which keyboard users can already
  trigger (Page Down, Space, arrow keys) without a mouse, so no
  separate "load more" control is required for it.
- RF-19: WHEN the visitor changes any filter, sort or search query, or
  clears them (RF-17), THE SYSTEM scrolls the results back to the top
  of the grid, so a new result set never starts from wherever the
  visitor had previously scrolled to.
- RF-20: WHEN the visitor types in the search field or changes a
  filter, THE SYSTEM updates the URL by replacing the current history
  entry rather than pushing a new one, so the browser's "back" button
  returns to wherever the visitor was before reaching this view, not
  through each intermediate keystroke or filter change.
- RF-21: IF the genre list fails to load, THEN THE SYSTEM hides or
  disables the genre control without showing a full error state —
  year, sort and search remain usable.
- RF-22: WHEN a failed additional-page request (RF-15) is retried
  successfully, THE SYSTEM clears the inline error and resumes normal
  infinite-scroll behavior for subsequent pages.

## Non-functional requirements
- **Data flow**: the initial, unfiltered view (RF-1) renders
  server-side and is visible without requiring client-side
  JavaScript, same as Spec 1 (constitution §3). Once the page is
  interactive, filtering, search and infinite scroll are
  client-driven — `hooks/` call `services/` via TanStack Query. How
  the two are bridged is a `plan.md` decision.
- **Validated boundaries**: `discover`, `search` and `genre/list`
  TMDB responses are each parsed with Zod in `services/`, same
  discipline as Spec 1 and Spec 2 (constitution §4).
- **Efficiency**: search requests are debounced (RF-6) to avoid firing
  one request per keystroke; an in-flight request that's superseded
  by a newer filter/search change is not applied when it resolves
  (avoids results from a stale request flashing over newer ones).
- **Language**: `language=en-US` for every TMDB request, same as
  Spec 1 and Spec 2.
- **Security**: reuses the existing server-only `TMDB_ACCESS_TOKEN`
  guard; no new secret handling.

## UI states
- **Loading** (RF-16): skeleton for a first page of a new
  filter/search/sort selection; inline indicator at the bottom for an
  appended page.
- **Empty** (RF-13): active filters/search yield zero results —
  contextual message, not a blank grid.
- **Error — first page** (RF-14): full error state with retry,
  same pattern as Spec 1/Spec 2.
- **Error — additional page** (RF-15): inline, at the bottom only;
  everything already loaded stays visible.
- **Exhausted** (RF-12): last page reached — scrolling further does
  nothing observable (no indicator, no error).
- **Success**: grid of matching movies, same `MovieCard` as Spec 1
  and Spec 2 (clickable through to the detail page).

## Edge cases
- Search field cleared back to under 2 characters: reverts to the
  default popular list (RF-1), not an empty search result.
- Whitespace-only search query: treated as empty (no request fired).
- Rapid, repeated filter changes before a request resolves: the last
  selection wins; a stale response arriving late is discarded.
- Browser back/forward navigation between two previously-visited
  filter states restores that state from the URL (RF-8/RF-9).
- A filtered/searched view that legitimately has fewer than one full
  page of results: RF-12 applies from the very first page.
- Genre list request itself fails: handled by RF-21, not RF-14 — the
  genre control is hidden/disabled, the rest of the page stays usable.
- A shared/bookmarked URL never encodes which page of infinite scroll
  the visitor had reached — opening it always starts at page 1 of
  that filtered/search view (RF-8/RF-9 cover filters and search only,
  not scroll depth).
- TMDB reports more pages are available (`total_pages`) but the next
  page actually returns an empty `results` array: treated the same as
  RF-12 (exhausted), not as an error.

## Out of scope
- Selecting more than one genre at a time.
- Combining search with genre/year/sort in a single request (TMDB
  doesn't support it) — RF-7 makes them mutually exclusive instead.
- Any filter beyond genre, year and sort: runtime, rating range,
  language, watch providers, etc.
- Saving or persisting filter presets across visits.
- Movie detail page changes (Spec 2) and its deferred "Extras" (Spec
  2's Spec-3 reference) — unrelated to this spec.
- Full WCAG 2.1 AA audit — still deferred project-wide; RF-18 is the
  same minimal keyboard baseline pattern used in Spec 2 (RF-12/RF-13),
  not a full audit.

## Definition of done
- RF-1 through RF-22 each have a passing automated test.
- Manual demo: filtering by genre/year/sort together narrows the
  grid; search finds a known title; scrolling loads further pages and
  stops cleanly once exhausted; the resulting URL reopened in a fresh
  tab reproduces the same view; clearing filters returns to the
  popular list; a simulated TMDB failure on the first page shows the
  full error state, and one on an additional page shows the inline
  error while keeping existing results.

## Open questions
None at this time.
