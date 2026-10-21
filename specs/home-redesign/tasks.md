# Tasks — Home redesign

58 tasks, ordered by dependency and grouped in the phases of the plan. `[P]` =
does not depend on any pending task in its own phase and can be done in parallel
with the other `[P]` tasks of that phase (the workflow still implements one task
at a time). `[manual]` = a step only the maintainer can do (material, a device, a
measurement); I guide it. `⚠️ approval` = an action visible outside the
repository (push, pull request, merge) or a decision that needs the maintainer's
approval at that moment, never assumed.

Spec: [`spec.md`](./spec.md) · Plan: [`plan.md`](./plan.md).

Rules that apply to every task and are not repeated below:
- Every task that adds code or configuration starts with its failing test (shown
  failing), then the code, then the full suite, `pnpm typecheck`, `pnpm lint`.
- **No existing test is edited or deleted** (the one approved deletion is T03).
  New cases are added next to the existing ones. If an existing test would break,
  the task stops and asks.
- Only tokens from `design.md` (after T01); no arbitrary values; no dependency
  added.
- Every task that changes what the visitor sees ends by passing the spec's audit
  checklist for that change (contrast in every state and over images, accessible
  names, keyboard order, reserved space, motion and reduced motion, 320 px); the
  answers are written in the commit message. T55 is the final pass, not the only
  one.
- A phase ends with a pull request that references the spec (`⚠️ approval`); the
  next phase starts from the merged result.

Dependencies at a glance:

| Phase | Tasks | Needs |
|---|---|---|
| 0 Before any code | T01–T05 | T05 ← T01, T03, T04 |
| 1 Foundations (no visible change) | T06–T23 | T06 ← T01 · icons T07–T09 ← T01 · T10 → T11 → T12 → T13 · T18, T19 ← T07 · T20 ← T07, T17 · T21 ← T20 · T22 independent · T23 ← all of the phase |
| 2 Shell | T24–T35 | T25 ← T22, T24 · T26 ← T06, T25 · T29 ← T09, T16, T27, T28 · T30 ← T25, T26, T29 · T32 ← T22, T30, T31 · T34 ← T30, T32 · T35 ← all of the phase |
| 3 Explorer composition | T36–T47 | T38 ← T08 · T39 ← T36–T38 · T41 ← T15, T39, T40 · T43 ← T08, T42 · T44 ← T41, T43 · T45 ← T20, T21, T06 · T46 ← T34, T44, T45, T17 · T47 ← all of the phase |
| 4 Hero | T48–T54 | T48 ← T06 · T49 ← T10, T08, T14, T18, T48 · T50 ← T06 · T51 ← T13, T14, T41, T49, T50 · T52 ← T51 · T53 ← T46, T52 · T54 ← all of the phase |
| 5 Verification and close | T55–T58 | T55–T57 ← T54 · T58 ← T55–T57 |

## Phase 0 — Before any code

- [x] **T01 — Update `design.md`** `⚠️ approval`
  - Depends on: —
  - Files: `docs/design.md` (modified)
  - RF: RF-12, 14, 17, 20, 23, 24–29 (their visual rules)
  - Done when: `design.md` lists as tokens the values of the spec's Appendix A (hero title sizes 40/48 and 28/36, control heights 44 and 48 px, the hero's height, the 400 ms duration, the card's enlargement of about 3 %, the background gradient and glow, the faint tints, the hero's dark layer) and records each exception with its reason — the gradient and the amber glow against "no gradients" and "amber is scarce", the capitalized hero title against "sentence case everywhere", the card's enlargement against "the poster does not move or scale" and "only color, background, border and opacity are animated", the curtain's height animation, and the header, hero, back-to-top button, About page and new icons as new parts of the component list; the maintainer approves the text in this conversation. No code is changed.

- [x] **T02 — Reference Lighthouse measurement** `[manual]`
  - Depends on: —
  - Files: — (the figures go in the private notes)
  - RF: non-functional (performance reference)
  - Done when: Lighthouse of the deployed home is measured on mobile and on desktop, in a private window with no extensions, the median of five runs each, and the figures and the method are written down for the final comparison; the earlier local baseline is kept as history only.

- [x] **T03 — Remove the unused list-view helper** `⚠️ approval`
  - Depends on: —
  - Files: `app/resolve-view-state.ts` (deleted), `app/resolve-view-state.test.ts` (deleted), `components/MovieGrid.tsx` (comment only)
  - RF: housekeeping (approved on 15 October 2026)
  - Done when: both files are gone in a commit of their own, no import of them remains (a search of the project returns none), the comment in `MovieGrid.tsx` no longer names the helper, and the full suite, typecheck, lint and build pass.

- [x] **T04 [P] — Fix the 300 ms search delay with a test**
  - Depends on: —
  - Files: `app/ExplorerClient.test.tsx` (new cases only)
  - RF: housekeeping (explore-filters RF-6)
  - Done when: new cases (written first) show that typing is not reflected in the URL before 300 ms and is reflected at 300 ms; changing the constant in `ExplorerClient.tsx` to 100 and to 600 makes one of them fail (shown once, then restored); no existing case is edited.

- [x] **T05 — Pull request of phase 0** `⚠️ approval`
  - Depends on: T01, T03, T04
  - Files: — (no repository files)
  - RF: —
  - Done when: the branch with the spec, the plan, these tasks, `design.md` and the housekeeping commits is pushed and a pull request referencing `specs/home-redesign/` is open; its four checks are green; the maintainer merges it; the production deployment of the merge is verified healthy.

## Phase 1 — Foundations (no visible change)

- [x] **T06 — New design tokens**
  - Depends on: T01
  - Files: `app/globals.css`, `app/globals.test.ts` (new cases)
  - RF: RF-12, 17, 20, 23, 27, 28 (their values)
  - Done when: new tests (written first, failing) assert that `@theme` defines each token approved in T01 — type sizes, control heights, durations, the card's enlargement — and that the existing token and reduced-motion tests are unchanged; they pass.

- [x] **T07 [P] — Design-system icons** 
  - Depends on: T01
  - Files: `components/icons/StarIcon.tsx`, `AlertIcon.tsx`, `FilmIcon.tsx`, `components/icons/design-system-icons.test.tsx`
  - RF: RF-35
  - Done when: a test (written first) renders each icon and checks the default size of 20 and the sizes 16, 20 and 24, the `viewBox`, `currentColor`, the 1.5 stroke and `aria-hidden="true"`; they pass. `StarIcon` follows the canvas; `AlertIcon` and `FilmIcon` are **not** in the canvas, so they are drawn in the same style, until the maintainer provides their own.

- [x] **T08 [P] — Redesign icons**
  - Depends on: T01
  - Files: `components/icons/ArrowUpIcon.tsx`, `ArrowRightIcon.tsx`, `ChevronDownIcon.tsx`, `ClapperboardIcon.tsx`, `components/icons/redesign-icons.test.tsx`
  - RF: RF-4, 6, 18, 24 (the controls that use them)
  - Done when: a test (written first) renders each icon with the same checks as T07; they pass. The paths come from the design canvas.

- [x] **T09 [P] — Header icons (temporary)**
  - Depends on: T01
  - Files: `components/icons/AuthorLogoIcon.tsx`, `LinkedInIcon.tsx`, `GitHubIcon.tsx`, `components/icons/brand-icons.test.tsx`
  - RF: RF-3
  - Done when: a test (written first) renders each icon with the same checks as T07; they pass. The glyphs are the canvas's stand-ins and are replaced in T28.

- [x] **T10 — Featured-movie schema and mapper**
  - Depends on: —
  - Files: `services/schemas/movie-schema.ts`, `services/schemas/movie-schema.test.ts` (new cases), `services/schemas/tmdb-mappers.ts`, `services/schemas/tmdb-mappers.test.ts` (new cases)
  - RF: RF-6, 7, 16, 33
  - Done when: new tests (written first) show that the raw movie accepts `backdrop_path`, `overview` and `genre_ids` as optional (a raw movie without them still parses), that `pickFeatured` returns the first movie with a backdrop in order and `undefined` when none has one, that the backdrop URL helper in `tmdb-mappers.ts` builds an address under TMDB's `original` size from a constant (no change to the shared image configuration), and that an empty overview stays empty; `Movie` and `toMovie` are unchanged and every existing test of both files passes untouched.

- [x] **T11 — Service: `featured` on popular page 1**
  - Depends on: T10
  - Files: `services/explore-service.ts`, `services/explore-service.test.ts` (new cases)
  - RF: RF-6, 7, 9
  - Done when: new tests (written first) show that popular page 1 carries `featured` computed from that same response with **one** TMDB request (a counter on the mock), that page 2, search and discover carry none, and that the key is **absent** (not `null`) when no movie has a backdrop; every existing `toEqual` case passes untouched.

- [x] **T12 — Browser schema and route accept `featured`**
  - Depends on: T11
  - Files: `services/explore-client.ts`, `services/explore-client.test.ts`, `app/api/explore/route.test.ts` (new cases)
  - RF: RF-7
  - Done when: new tests (written first) show that the browser's schema accepts a valid `featured`, rejects a malformed one as `invalid_response`, and that the route forwards `featured` for popular page 1; the existing cases pass untouched.

- [x] **T13 — Hook returns `featured`**
  - Depends on: T12
  - Files: `hooks/useExploreMovies.ts`, `hooks/useExploreMovies.test.ts` (new cases)
  - RF: RF-7, 11
  - Done when: new tests (written first) show that the hook returns the first page's `featured` for the popular list and `null` for other modes or when it is absent, and that moving from a filtered view back to the popular list performs one request and no more; the existing cases pass untouched.

- [x] **T14 [P] — First genre name**
  - Depends on: —
  - Files: `app/featured-genre.ts`, `app/featured-genre.test.ts`
  - RF: RF-6, 16
  - Done when: tests (written first) show that `firstGenreName` returns the name of the first id that exists in the list, skips unknown ids, and returns `null` for an empty list or when no id resolves.

- [x] **T15 [P] — Results heading text**
  - Depends on: —
  - Files: `app/results-heading.ts`, `app/results-heading.test.ts`, `components/SortFilter.tsx` (export the existing sort labels, nothing else)
  - RF: RF-21, 22
  - Done when: tests (written first) cover every branch of `resultsHeading`: "Popular movies"; `Results for “<trimmed text>”`; the active filter names joined by " · " in the order genre, year, sort and only the active ones; "Filtered movies" when a filter is active but no name resolves; the existing `SortFilter` tests pass untouched.

- [x] **T16 [P] — Site configuration and link validation**
  - Depends on: —
  - Files: `app/site-config.ts`, `app/site-config.test.ts`
  - RF: RF-3
  - Done when: tests (written first) show that `visibleLinks` keeps only complete `https` addresses, hides empty ones, malformed ones and other schemes (`http`, `javascript:`), and returns the three links in a fixed order; the committed configuration has empty addresses until T28.

- [x] **T17 [P] — Skeletons stop with reduced motion**
  - Depends on: —
  - Files: `components/MovieCardSkeleton.tsx`, `components/MovieCardSkeleton.test.tsx` (new case)
  - RF: RF-36
  - Done when: a new test (written first) shows that every pulsing block also carries the reduced-motion switch while exactly three blocks keep the `animate-pulse` class; the existing two tests pass untouched.

- [x] **T18 — Rating star**
  - Depends on: T07
  - Files: `components/RatingBadge.tsx`, `components/RatingBadge.test.tsx` (new cases)
  - RF: RF-35
  - Done when: new tests (written first) show a decorative star next to a numeric rating, the accessible label "Rated 7.8 out of 10" unchanged, and no star for "No rating"; the existing cases pass untouched.

- [x] **T19 [P] — Alert and film icons in the states**
  - Depends on: T07
  - Files: `components/ErrorState.tsx`, `components/EmptyState.tsx`, their tests (new cases)
  - RF: RF-35
  - Done when: new tests (written first) show a decorative alert icon in the error state and a decorative film icon in the empty state, with texts, roles and the retry control unchanged; the existing cases pass untouched.

- [x] **T20 — Card fallback poster and reserved border**
  - Depends on: T07, T17
  - Files: `components/MovieCard.tsx`, `components/MovieCardSkeleton.tsx`, `components/MovieCard.test.tsx` (new cases)
  - RF: RF-23, 35, 36
  - Done when: new tests (written first) show that a card without poster shows a surface with a decorative film icon of the same proportions, that every card has a transparent 2 px border at rest and the skeleton has the same, and the existing case "no `img` role without a poster" passes untouched.

- [x] **T21 — Priority for the first posters**
  - Depends on: T20
  - Files: `components/MovieCard.tsx`, `components/MovieGrid.tsx`, their tests (new cases)
  - RF: RF-32
  - Done when: new tests (written first) show that the first few cards' images have high fetch priority and are not lazy, and the rest are lazy; the number is one named constant; the existing cases pass untouched.

- [x] **T22 [P] — Page titles and descriptions**
  - Depends on: —
  - Files: `app/site-metadata.ts`, `app/site-metadata.test.ts`, `app/layout.tsx` (metadata only), `app/page.tsx` (metadata only)
  - RF: RF-34
  - Done when: a test (written first) asserts a default title and description, a title template, the home's own title and description and the About page's entry, that none of them contains the framework's default text, and that the layout and the home use them; they pass.

- [x] **T23 — Pull request of phase 1** `⚠️ approval`
  - Depends on: T06–T22
  - Files: — (no repository files)
  - RF: —
  - Done when: the branch is pushed and a pull request referencing the spec is open; its four checks are green; the maintainer merges it; the production deployment is verified healthy; nothing looks different on the deployed pages except the new icons in the states, the film icon of the missing-poster fallback, the 2 px border that makes each card 4 px larger, and the page titles.

## Phase 2 — Shell

- [x] **T24 [P] — Skip link**
  - Depends on: T23
  - Files: `components/SkipLink.tsx`, `components/SkipLink.test.tsx`
  - RF: RF-5
  - Done when: tests (written first) show a link "Skip to content" pointing at the main area's id, visually hidden until it has focus, and the first focusable element when rendered before other content; they pass.

- [x] **T25 — One main area for every page**
  - Depends on: T22, T24
  - Files: `app/layout.tsx`, `app/page.tsx`, `app/movie/[id]/page.tsx`, `app/landmark.test.ts`
  - RF: RF-5, 1
  - Done when: a text test (written first, failing) asserts that the layout declares exactly one `<main>` with the id the skip link targets, renders the skip link, and that neither page declares its own `<main>`; it passes; `pnpm build` passes and the pages look unchanged.

- [x] **T26 — Fixed background**
  - Depends on: T06, T25
  - Files: `app/globals.css`, `app/layout.tsx`, `app/globals.test.ts` (new cases), `app/background-contrast.test.ts`
  - RF: RF-27, 28, 29
  - Done when: new tests (written first) assert that the layer is fixed and sized to the large viewport, built from the tokens with no literal colors, that the header and bar tints and the hero's fade are defined, that no divider border is declared between the sections, and a computed contrast test shows that the foreground, muted, subtle and accent colors keep their required ratio over the lightest point of the gradient plus glow; they pass.

- [x] **T27 [P] — Header navigation with the current page**
  - Depends on: T23
  - Files: `components/HeaderNav.tsx`, `components/HeaderNav.test.tsx`
  - RF: RF-2
  - Done when: tests (written first, with a mocked pathname) show that "Home" is the current page on `/` and with query strings, "About" on `/about`, none on `/movie/1`, that the current link is marked for assistive technology and is also underlined and bolder (not color only); they pass.

- [x] **T28 — The maintainer's addresses and icons** `[manual]`
  - Depends on: T09, T16
  - Files: `app/site-config.ts`, `components/icons/AuthorLogoIcon.tsx`, `LinkedInIcon.tsx`, `GitHubIcon.tsx`
  - RF: RF-3
  - Done when: the maintainer's three `https` addresses are in the configuration and the three icons are the maintainer's own, **before** the header is implemented (or the maintainer explicitly approves shipping with an empty configuration, in which case the header shows no external link and the placeholders stay); none of the addresses is this app's production address (deploy-ci RF-18); `visibleLinks` returns the filled ones; the T16 and T09 tests still pass.

- [x] **T29 — Site header**
  - Depends on: T09, T16, T27, T28
  - Files: `components/SiteHeader.tsx`, `components/SiteHeader.test.tsx`
  - RF: RF-1, 3, 4
  - Done when: tests (written first) show that the brand links to the home with an accessible name, that "Home" and "About" appear, that the external links are only the visible ones, open in a new tab and say so in their accessible name, that there are two variants whose element order is brand, links, icons (wide) and brand, icons, links (narrow), and that the brand's text is hidden visually at the smallest width while its name remains; they pass.

- [x] **T30 — Header in the layout**
  - Depends on: T25, T26, T29
  - Files: `app/layout.tsx`, `app/landmark.test.ts` (new case)
  - RF: RF-1
  - Done when: a new test (written first) asserts that the layout renders the skip link, the header and the single main area in that order; it passes; `pnpm build` passes and the header shows on `/`.

- [x] **T31 — TMDB logo** `[manual]`
  - Depends on: —
  - Files: the logo asset under `public/`
  - RF: RF-30
  - Done when: the maintainer adds the official TMDB logo from TMDB's logo page, the variant and the usage guidelines (less prominent than the application's own name, no implied endorsement) are read and noted in the task's description, and the file is in the repository.
  - Evidence (2026-10-19): the logo is TMDB's short blue variant (`blue_short`, a single line, 273 × 35), downloaded unmodified from TMDB's logo page into `public/tmdb-logo.svg`; it is one path with a gradient, with no script, link or embedded image. The rules come from TMDB's API terms of use, section 3: use the logo to identify the use of TMDB; keep it less prominent than the application's own logo or mark and without implying endorsement; and place the notice "This [website, program, service, application, product] uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB." prominently in the application. The notice the spec first asked for was the older wording, so RF-30 and the later tasks were updated to the current one. Also in the terms: no commercial use without a separate agreement (the project stays free), and a six-month limit on caching TMDB data.

- [x] **T32 — About page**
  - Depends on: T22, T30, T31
  - Files: `app/about/page.tsx`, `components/TmdbAttribution.tsx`, `components/TmdbAttribution.test.tsx`
  - RF: RF-30, 34
  - Done when: tests (written first) show that the attribution shows the exact notice "This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB." and the logo with a text alternative, that the page has one level-one heading, and that its metadata is the About entry of T22; they pass; the page is reachable from the header.

- [x] **T33 — README attribution**
  - Depends on: T31
  - Files: `README.md`, `readme-attribution.test.ts`
  - RF: RF-31
  - Done when: a root-level text test (written first, failing) asserts the exact statement and the logo reference in `README.md`; it passes along with the existing README and `no-secret-leak` tests.

- [x] **T34 — End-to-end: the shell**
  - Depends on: T30, T32
  - Files: `e2e/home-redesign.spec.ts` (new)
  - RF: RF-1, 2, 4, 5, 15, 30, 34
  - Done when: the new spec passes locally: the header and the skip link on `/`, `/about`, a movie and a not-found page; exactly one `main` on each; the first Tab focuses the skip link and Enter moves focus to the main area; the current page is marked; the tab order equals the visual order at 390 and 1280 px; no horizontal scroll at 320 px with the brand's text hidden; each page's title; a run with JavaScript disabled still shows the header, the skip link and the About page; the result is noted.
  - Result: `e2e/home-redesign.spec.ts` passes locally in Chromium, 18 tests. Tab order measured at 390 px (skip link, brand, the three external links, Home, About) and 1280 px (skip link, brand, Home, About, the three external links); each equals the visual order.

- [x] **T35 — Pull request of phase 2** `⚠️ approval`
  - Depends on: T24–T34
  - Files: — (no repository files)
  - RF: —
  - Done when: the branch is pushed and a pull request referencing the spec is open; its four checks are green; the maintainer merges it; the deployment verification is healthy; the header, the background and `/about` are live on the public address.
  - Result: PR #21 merged into `main` (`b1dc095`); its four checks and CI on `main` passed, and the deployment verification ended in success. The header, the background and `/about` were checked live by the maintainer.

## Phase 3 — Explorer composition

- [x] **T36 — Filter bar layout and the reserved room**
  - Depends on: T35
  - Files: `components/FilterBar.tsx`, `components/FilterBar.test.tsx` (new cases)
  - RF: RF-18, 19
  - Done when: new tests (written first) show that with the clear control hidden an empty, hidden placeholder keeps its room (no button, same element order) and that the bar keeps the three selectors in the same order; the existing `FilterBar` cases pass untouched and `ClearFiltersButton.tsx` has no change.
  - Result: 7 new cases (6 in `FilterBar.test.tsx`, 1 in `globals.test.ts`) failed first and now pass; the existing cases pass untouched and `ClearFiltersButton.tsx` is unchanged. Approved addition outside the file list: the token `--size-clear-filters` (132px) in `app/globals.css` and `docs/design.md`, because the reserved room needs a width that no token covered.

- [ ] **T37 [P] — Search field restyle**
  - Depends on: T35
  - Files: `components/SearchInput.tsx`, `components/SearchInput.test.tsx` (new cases)
  - RF: RF-13, 18, 20
  - Done when: new tests (written first) show that the label is visually hidden yet still names the field and that the field accepts a reference to its input (so the hero can send focus to it); the existing cases pass untouched.

- [ ] **T38 [P] — Selectors restyle**
  - Depends on: T08, T35
  - Files: `components/GenreFilter.tsx`, `components/YearFilter.tsx`, `components/SortFilter.tsx`, their tests (new cases)
  - RF: RF-18, 20
  - Done when: new tests (written first) show that each label is visually hidden yet still names its selector and that the chevron icon is decorative; options, values and behavior are unchanged and the existing cases pass untouched.

- [ ] **T39 — Search and filters bar**
  - Depends on: T36, T37, T38
  - Files: `components/SearchFiltersBar.tsx`, `components/SearchFiltersBar.test.tsx`
  - RF: RF-18
  - Done when: tests (written first) show that the bar renders the search field, then genre, year, sort and the clear control in that DOM order, forwards every prop (including the reference to the search input), and exposes the anchor the back-to-top button needs; they pass.

- [ ] **T40 [P] — Results announcer**
  - Depends on: T15, T35
  - Files: `components/ResultsAnnouncer.tsx`, `components/ResultsAnnouncer.test.tsx`
  - RF: RF-22
  - Done when: tests (written first) show a visually hidden polite live region that carries the given text and renders nothing for an empty text; they pass.

- [ ] **T41 — Heading, announcer and bar in the explorer**
  - Depends on: T15, T39, T40
  - Files: `app/ExplorerClient.tsx`, `app/ExplorerClient.test.tsx` (new cases)
  - RF: RF-18, 21, 22
  - Done when: new tests (written first) show the results heading's text in each state (popular, search, filters, unresolved filter), that the announcer says the heading's text once the first page has loaded with results and says nothing for an empty result (the existing empty state is the only announcement), and that the `results-anchor` test id and the Tab order are unchanged; the existing cases pass untouched.

- [ ] **T42 [P] — Back-to-top visibility hook**
  - Depends on: T35
  - Files: `hooks/useBackToTopVisibility.ts`, `hooks/useBackToTopVisibility.test.ts`
  - RF: RF-24
  - Done when: tests (written first, with the existing `MockIntersectionObserver`) show that the hook is false at first, becomes true when the sentinel is above the viewport, returns to false when it comes back, and disconnects on unmount.

- [ ] **T43 — Back-to-top button**
  - Depends on: T08, T42
  - Files: `components/BackToTopButton.tsx`, `components/BackToTopButton.test.tsx`
  - RF: RF-24, 26
  - Done when: tests (written first) show an icon-only button named "Back to top of results", unreachable by keyboard and hidden from assistive technology while not visible, focusable when visible, calling its handler on activation; they pass.

- [ ] **T44 — Back-to-top in the explorer**
  - Depends on: T41, T43
  - Files: `app/ExplorerClient.tsx`, `app/ExplorerClient.test.tsx` (new cases)
  - RF: RF-24, 25
  - Done when: new tests (written first) show that the button is absent from the tab order at first, appears when the sentinel 300 px below the bar has passed, and on activation scrolls to the bar (smoothly unless reduced motion is preferred) and moves focus to the results heading; the existing cases, including the RF-19 scroll test, pass untouched.

- [ ] **T45 — Card hover**
  - Depends on: T06, T20, T21
  - Files: `components/MovieCard.tsx`, `components/MovieCard.test.tsx` (new cases)
  - RF: RF-23
  - Done when: new tests (written first) show the accent border and the accent title on hover, the enlargement only under the motion-safe variant, a raised stacking order while hovered, and no enlargement on focus; the keyboard focus indicator is untouched; the existing cases pass untouched.

- [ ] **T46 — End-to-end: bar, results, back-to-top, cards**
  - Depends on: T34, T44, T45, T17
  - Files: `e2e/home-redesign.spec.ts` (new cases)
  - RF: RF-18, 19, 20, 22, 23, 24, 25, 26, 28, 36
  - Done when: the new cases pass locally: the bar's controls are at least 44 px high (48 px at 390 px) with 16 px text in the field and selectors; the bar is one row at 1280 px and two columns at 390 px; showing and hiding "Clear filters" moves nothing; no divider borders between the sections; the back-to-top button appears after scrolling, moves focus to the results heading and does not cover the focused element; a card on hover shows the gold border, the enlarged scale, unmoved neighbors and is the topmost element at its corners; with reduced motion emulated, a card does not enlarge and the skeletons have no animation; the result is noted.

- [ ] **T47 — Pull request of phase 3** `⚠️ approval`
  - Depends on: T36–T46
  - Files: — (no repository files)
  - RF: —
  - Done when: the branch is pushed and a pull request referencing the spec is open; its four checks are green; the maintainer merges it; the deployment verification is healthy.

## Phase 4 — Hero

- [ ] **T48 — Hero's dark layer and its contrast**
  - Depends on: T06, T47
  - Files: `app/globals.css`, `app/hero-contrast.test.ts`
  - RF: RF-17, 29
  - Done when: a computed test (written first) composes the layer over a pure white image at the text positions for widths 1280, 1440 and 1920 px and asserts at least 4.5:1 for the text and 3:1 for the title; if the canvas values fail it, the layer is strengthened only under the text and the test passes; the stops are CSS properties the test reads.

- [ ] **T49 — Featured hero**
  - Depends on: T10, T08, T14, T18, T48
  - Files: `components/FeaturedHero.tsx`, `components/FeaturedHero.test.tsx`
  - RF: RF-6, 10, 14, 15, 16, 17, 28, 32, 33
  - Done when: tests (written first) show the title, first genre, year, rating out of 10, a three-line synopsis and a "Details" link whose accessible name includes the title and whose target is the movie's page; that a missing genre, an empty synopsis and a missing rating are simply omitted or shown as "No rating"; that the title keeps its written text and is capitalized by style only; that the image has an empty description, high priority, full-width `sizes`, and that an image error keeps all the text on a plain background; the hero is a `section`, not an `article`; that the image sits in a container with the vertical fade of RF-28; they pass.

- [ ] **T50 [P] — Hero curtain**
  - Depends on: T06, T47
  - Files: `components/HeroCurtain.tsx`, `components/HeroCurtain.test.tsx`
  - RF: RF-9, 12, 13
  - Done when: tests (written first) show that closed content is `inert` and hidden from assistive technology, that focus inside it moves to the element given by its `focusOnClose` reference (the search field) when it closes, that data arriving late mounts collapsed and opens, that the settle callback fires when the curtain ends or at once without animation, and that nothing is rendered when there is no content; they pass.

- [ ] **T51 — Hero in the explorer**
  - Depends on: T13, T14, T41, T49, T50
  - Files: `app/ExplorerClient.tsx`, `app/ExplorerClient.test.tsx` (new cases)
  - RF: RF-6, 7, 8, 9, 11, 15
  - Done when: new tests (written first) show that the hero is open on the popular list with an empty field, and that the featured movie is still a card in the grid; that the first typed character closes it before the debounce; that any filter closes it; that clearing reopens it; that a start with filters has no hero and clearing makes **one** popular request and opens it with no other request; that without `featured` nothing is reserved; and that the home has a single level-one heading with the hero's title below it; the existing cases pass untouched.

- [ ] **T52 — Scroll settling after the curtain**
  - Depends on: T51
  - Files: `app/ExplorerClient.tsx`, `app/ExplorerClient.test.tsx` (new cases)
  - RF: RF-12
  - Done when: new tests (written first) show that a filter change with the hero open scrolls the results anchor once at once (the existing call) and once more when the curtain settles; that a search typed with the hero open, whose navigation arrives after the debounce and possibly before the curtain ends, ends with exactly one extra call after both the navigation and the curtain have finished, whichever is later; that with no hero it scrolls once; and that with reduced motion it settles immediately; the existing RF-19 test passes untouched.

- [ ] **T53 — End-to-end: the hero**
  - Depends on: T46, T52
  - Files: `e2e/home-redesign.spec.ts` (new cases)
  - RF: RF-6, 8, 9, 11, 12, 13, 14, 15, 16, 17
  - Done when: the new cases pass locally: the hero is visible on `/`, the featured movie also appears as a card, "Details" opens its page; typing one character closes it and clearing reopens it; after a filter change the results heading is at the top edge of the visible area 450 ms later (immediately with reduced motion); focus on "Details" moves to the search field when the hero closes; the title is capitalized by style while its accessible name is as written; one level-one heading; with an unreachable list there is no hero and nothing is reserved; a run with JavaScript disabled still shows the hero on `/`; the result is noted.

- [ ] **T54 — Pull request of phase 4** `⚠️ approval`
  - Depends on: T48–T53
  - Files: — (no repository files)
  - RF: —
  - Done when: the branch is pushed and a pull request referencing the spec is open; its four checks are green; the maintainer merges it; the deployment verification is healthy and the redesigned home is live on the public address.

## Phase 5 — Verification and close

- [ ] **T55 — Audit pass** `[manual]`
  - Depends on: T54
  - Files: — (the results go in the private notes and the pull request description)
  - RF: the non-functional audit requirements; RF-4, 5, 13, 15
  - Done when: an accessibility checker has been run on every state of the home and on the About page with no serious issue left; the audit checklist of the spec is passed for each change; keyboard on the home and About, a screen reader (VoiceOver) on the home, 200 % text size and 400 % zoom, 320 px width, reduced motion and forced colors are checked; the contrast of the detail page's text over the new background is checked by hand; the browser console is clean; each result is noted.

- [ ] **T56 — Real-device checks and recorded demonstrations** `[manual]`
  - Depends on: T54
  - Files: — (the results go in the pull request description)
  - RF: RF-12, 26, 27, 29
  - Done when: on a real phone and in iOS Safari the curtain with the keyboard open, the back-to-top button against the browser bar and the safe area, the fixed background and the image fade, and the contrast of the hero text over several real backdrops are each recorded as a demonstration, along with the card's hover on a mouse and its absence on touch.

- [ ] **T57 — Final Lighthouse measurement** `[manual]`
  - Depends on: T54
  - Files: — (the figures go in the private notes and the README if the maintainer wants them)
  - RF: non-functional (performance); RF-32, 33
  - Done when: Lighthouse is measured on the public address with T02's method (mobile and desktop, median of five) for the home and the About page; every category is at least 90 on both, and no home score is below the reference of T02 (the About page is new and has no earlier reference); the figures are noted and compared.

- [ ] **T58 — Record and close**
  - Depends on: T55, T56, T57
  - Files: — (the description of the last pull request)
  - RF: all (definition of done)
  - Done when: the description lists the recorded demonstrations and the measurements with their evidence; `pnpm typecheck`, `pnpm lint`, the full suite and `pnpm build` pass on `main`; the dependency sections of `package.json` are identical to those of the base commit; the production address appears nowhere in the repository; the deployment verification of the final commit is healthy; every checkbox in this file is ticked.

## Requirements coverage

| RF | Tasks |
|---|---|
| RF-1 | T25, T29, T30, T34 |
| RF-2 | T27, T34 |
| RF-3 | T09, T16, T28, T29 |
| RF-4 | T08, T29, T34, T55 |
| RF-5 | T24, T25, T34, T55 |
| RF-6 | T08, T10, T11, T14, T49, T51, T53 |
| RF-7 | T10, T11, T12, T13, T51 |
| RF-8 | T51, T53 |
| RF-9 | T11, T50, T51, T53 |
| RF-10 | T49 |
| RF-11 | T13, T51, T53 |
| RF-12 | T01, T06, T50, T52, T53, T56 |
| RF-13 | T37, T50, T53, T55 |
| RF-14 | T01, T49, T53 |
| RF-15 | T34, T49, T51, T53, T55 |
| RF-16 | T10, T14, T49, T53 |
| RF-17 | T01, T06, T48, T49, T53 |
| RF-18 | T08, T36, T37, T38, T39, T41, T46 |
| RF-19 | T36, T46 |
| RF-20 | T01, T06, T37, T38, T46 |
| RF-21 | T15, T41 |
| RF-22 | T15, T40, T41, T46 |
| RF-23 | T01, T06, T20, T45, T46 |
| RF-24 | T01, T08, T42, T43, T44, T46 |
| RF-25 | T01, T44, T46 |
| RF-26 | T01, T43, T46, T56 |
| RF-27 | T01, T06, T26, T56 |
| RF-28 | T01, T06, T26, T46, T49 |
| RF-29 | T01, T26, T48, T56 |
| RF-30 | T31, T32, T34 |
| RF-31 | T33 |
| RF-32 | T21, T49, T57 |
| RF-33 | T10, T49, T57 |
| RF-34 | T22, T32, T34 |
| RF-35 | T07, T18, T19, T20 |
| RF-36 | T17, T20, T46 |

**Requirements without a task: none.** Housekeeping is T03 and T04. Tasks that
need the maintainer: T01 (approval), T02, T28, T31 (material), T55, T56, T57
(measurements and devices), and the pull requests T05, T23, T35, T47, T54.
