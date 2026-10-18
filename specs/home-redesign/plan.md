# Plan — Home redesign

Spec: [`specs/home-redesign/spec.md`](./spec.md) (RF-1 to RF-36, plus the
housekeeping tasks). No implementation code below — types, interfaces and
structure only.

The redesign touches four kinds of things: **shared shell** (header, skip link,
main landmark, background, About page, metadata), **the explorer's composition**
(a featured movie above the search and filters, a redesigned bar, a results
heading, a back-to-top button), **shared presentational pieces** (card hover,
icons, skeletons) and **the data path** that feeds the featured movie. The
explorer's behavior (URL as source of truth, debounce, infinite scroll) is not
changed; where the plan touches it, it only adds.

## Modules

### Data path (the featured movie)

| Module | Kind | Responsibility | RF |
|---|---|---|---|
| `services/schemas/movie-schema.ts` (modified) | Schema + mapper | Raw movie gains three **optional** fields (`backdrop_path`, `overview`, `genre_ids`); new domain type `FeaturedMovie` and a pure mapper `toFeaturedMovie`; a pure `pickFeatured` that returns the first movie with a backdrop. `Movie` itself is **not** widened | RF-6, 7, 16, 33 |
| `services/explore-service.ts` (modified) | Service (server) | The popular page 1 response gets an optional `featured`, computed from that same response; no other mode and no later page carries it | RF-6, 7, 9 |
| `services/explore-client.ts` (modified) | Service (browser) | The client-side Zod schema of `/api/explore` accepts the optional `featured` (constitution §4) | RF-7 |
| `app/api/explore/route.ts` | Route | Unchanged: it forwards the service's JSON, so `featured` travels to the browser when the popular list is requested | RF-7 |
| `hooks/useExploreMovies.ts` (modified) | Hook | Returns `featured` (first page's, or `null`) next to the movies | RF-7, 11 |
| `app/featured-genre.ts` (new) | Pure helper | `firstGenreName(genreIds, genres)`: the first id that has a name in the genre list, else `null` | RF-6, 16 |

### Shell (every page)

| Module | Kind | Responsibility | RF |
|---|---|---|---|
| `app/site-config.ts` (new) | Config + pure helper | The site's name and the three external addresses (author's site, LinkedIn, GitHub); `visibleLinks()` keeps only complete `https` addresses | RF-3 |
| `components/SiteHeader.tsx` (new, server) | Component | The header: brand, "Home"/"About", external links. Renders **two layout variants** (wide, narrow) of which CSS shows one, so keyboard order equals visual order at every width | RF-1, 3, 4 |
| `components/HeaderNav.tsx` (new, client) | Component | The only client part of the header: marks the current page (`usePathname`) | RF-2 |
| `components/SkipLink.tsx` (new) | Component | First focusable element of every page; targets the main area | RF-5 |
| `app/layout.tsx` (modified) | Layout | Skip link, header, the **single** `<main id=…>` for every page, the fixed background layer, the metadata template and default | RF-1, 5, 27, 34 |
| `app/page.tsx`, `app/movie/[id]/page.tsx` (modified) | Pages | Stop declaring their own `<main>` (the layout provides it); nothing else changes in the detail page; the home exports its own metadata | RF-5, 34 |
| `app/about/page.tsx` (new, server) | Page | Page heading and the TMDB attribution (statement + logo); its own metadata | RF-30, 34 |
| `components/TmdbAttribution.tsx` (new) | Component | The statement and the logo, shared by the About page | RF-30 |
| `README.md` (modified) | Docs | Same attribution | RF-31 |
| `components/icons/*` (new, see below) | Components | Icons of the design system and of the redesign | RF-35 and others |
| `app/globals.css` (modified) | Styles/tokens | New tokens (type sizes, control heights, durations, scale), the fixed background layer, bands and tints, the hero scrim, the card hover utility, the curtain classes | RF-12, 17, 20, 23, 27, 28 |
| `docs/design.md` (modified, **first**) | Docs | The same tokens and the exceptions the spec lists, with reasons | all visual RF |

### Explorer composition (home)

| Module | Kind | Responsibility | RF |
|---|---|---|---|
| `app/ExplorerClient.tsx` (modified) | Client composition root | Renders hero, bar, heading, announcer, results and the back-to-top button; derives `heroOpen` from state it already owns (`searchText`, `filters`); settles the scroll after the curtain. Behavior of search, filters, URL and infinite scroll untouched | RF-6, 7, 9, 11, 12, 13, 21, 22, 24, 25 |
| `components/FeaturedHero.tsx` (new) | Component | Title, first genre, year, rating, three-line synopsis, "Details" link, decorative backdrop with a plain fallback if the image fails | RF-6, 10, 14, 15, 16, 17, 32, 33 |
| `components/HeroCurtain.tsx` (new) | Component | Open/closed wrapper: the curtain, `inert` + `aria-hidden` while closed, focus rescue, mount-collapsed-then-open for late data, a callback when the curtain settles | RF-9, 12, 13 |
| `components/SearchFiltersBar.tsx` (new) | Component | Layout of the search field plus the filter group (one row wide, two columns narrow); the scroll anchor of the back-to-top button | RF-18 |
| `components/FilterBar.tsx` (modified) | Component | Layout of the three selectors; **reserves the room** of "Clear filters" with a placeholder when it is not shown | RF-18, 19 |
| `components/SearchInput.tsx`, `GenreFilter.tsx`, `YearFilter.tsx`, `SortFilter.tsx` (modified) | Components | Restyled (heights, text size); labels become visually hidden but remain real `<label>`s; no change of props, options or behavior | RF-18, 20 |
| `components/ClearFiltersButton.tsx` | Component | **Unchanged** (it still renders nothing when not visible) | RF-19 |
| `app/results-heading.ts` (new) | Pure helper | `resultsHeading(filters, genres)`: the text of RF-21 | RF-21, 22 |
| `components/ResultsAnnouncer.tsx` (new) | Component | A visually hidden polite live region with the heading's text once results load | RF-22 |
| `components/BackToTopButton.tsx` (new) | Component | Icon-only fixed button, hidden and unfocusable until shown | RF-24, 25, 26 |
| `hooks/useBackToTopVisibility.ts` (new) | Hook | `IntersectionObserver` on a sentinel 300 px below the bar (no scroll listener) | RF-24 |
| `components/MovieCard.tsx` (modified) | Component | Transparent 2 px border at rest; gold border, accent title and 3 % enlargement on hover; the missing-poster fallback with the film icon; `priority` for the first posters | RF-23, 32, 35 |
| `components/MovieCardSkeleton.tsx` (modified) | Component | Same new border as the card (same footprint); `motion-reduce` switches the pulse off | RF-36 |
| `components/MovieGrid.tsx` (modified) | Component | Passes `priority` to the first few cards | RF-32 |
| `components/RatingBadge.tsx`, `ErrorState.tsx`, `EmptyState.tsx` (modified) | Components | Star, alert and film icons (decorative, hidden from assistive technology); texts and roles unchanged | RF-35 |

### Icons (`components/icons/`, one file each, `design.md` format)
`StarIcon` (from the canvas), `AlertIcon` and `FilmIcon` (design system; **not**
in the canvas, drawn in the same style) · `ArrowUpIcon`,
`ArrowRightIcon`, `ChevronDownIcon`, `ClapperboardIcon` (redesign; SVG taken from
the canvas) · `AuthorLogoIcon`, `LinkedInIcon`, `GitHubIcon` (placeholders from
the canvas until the maintainer provides the final ones) · the TMDB logo as an
asset provided by the maintainer. `SearchIcon` already exists.

### Housekeeping (first, own commits)
- Delete `app/resolve-view-state.ts` and `app/resolve-view-state.test.ts`
  (approved on 15 October 2026). The only other mention is a comment in
  `MovieGrid.tsx`, which is updated in the same commit.
- A new test that fixes the 300 ms debounce, added as new cases (no existing
  test is edited).

### Tests and verification
`*.test.ts(x)` next to each file; end-to-end specs in `e2e/` (a new
`home-redesign.spec.ts`); root-level text tests where a test spans files (the
README attribution, like `env-example.test.ts`); recorded demonstrations for the
four aspects of the spec's scoped exception.

## Component tree

```
RootLayout (app/layout.tsx)                       ← metadata template + default (RF-34)
├─ fixed background layer (CSS, behind everything)   RF-27, 28
├─ SkipLink                                           RF-5
├─ SiteHeader                                         RF-1, 3, 4
│   ├─ wide variant:   brand · HeaderNav · external links      (hidden below 1024 px)
│   └─ narrow variant: brand · external links · HeaderNav      (hidden from 1024 px)
│        HeaderNav = the only client part (aria-current)        RF-2
├─ <main id="…">                                      RF-5 (the only landmark of this kind)
│   ├─ "/"  Home page (server) → ExplorerClient (client, server-rendered first)
│   │     ├─ <h1> (visually hidden)                             RF-15
│   │     ├─ HeroCurtain (open = no text, no filter, featured exists)   RF-9, 11, 12, 13
│   │     │     └─ FeaturedHero (<section>, not an <article>)           RF-6, 10, 14–17
│   │     ├─ SearchFiltersBar                                           RF-18–20
│   │     │     ├─ SearchInput
│   │     │     └─ FilterBar → Genre · Year · Sort · [Clear filters | reserved room]
│   │     ├─ sentinel for the back-to-top button (300 px below the bar) RF-24
│   │     ├─ results anchor (existing data-testid)
│   │     │     ├─ results heading (<h2>, tabIndex -1)                  RF-21, 25
│   │     │     ├─ ResultsAnnouncer (visually hidden live region)       RF-22
│   │     │     └─ skeletons | ErrorState | EmptyState | MovieGrid → MovieCard   RF-23, 32, 35, 36
│   │     └─ BackToTopButton (home only)                                RF-24–26
│   ├─ "/about"  About page → <h1> + TmdbAttribution                    RF-30
│   └─ "/movie/[id]" and the not-found pages: unchanged content         RF-1
```

Naming follows `AGENTS.md`: components PascalCase, everything else kebab-case,
hooks camelCase with the `use` prefix (the folder already holds non-Query hooks
such as `useDebouncedValue`).

## State and routes

**Routes.** One new route, `/about` (static). `/` and `/movie/[id]` keep their
contract; `/api/explore` keeps its query parameters and gains one optional field
in its JSON.

**State that exists and is reused** (no new store, constitution §6):

| State | Owner | Used by |
|---|---|---|
| `filters` (URL, plus the optimistic `pending`) | `ExplorerClient` | hero open/closed, heading, announcer |
| `searchText` (what the field contains, before the debounce) | `ExplorerClient` | hero closes on the **first character** (RF-11) |
| TanStack Query cache, key `["explore", mode, params]` | `useExploreMovies` | `featured` of the popular entry |

**Derived, never stored:**
`heroOpen = filters.mode is "popular" AND searchText is "" AND featured exists`.
Because the popular list is requested whenever the filters are cleared, the hero's
data arrives with the response the grid needs anyway (RF-7); nothing extra is
fetched.

**Local state of new components:**
- `HeroCurtain`: whether it has "settled" after a change, and a one-frame
  "mounted collapsed" flag for data that arrives late.
- `FeaturedHero`: whether its image failed.
- `useBackToTopVisibility`: whether the sentinel is above the viewport.
- `ExplorerClient` keeps one ref to remember that the current curtain change
  came from a filter change, so it can settle the scroll afterwards.

**Server-rendered first paint:** header, hero (only when the URL is the popular
list), bar and first results come from the server, so the page works without
JavaScript (spec, non-functional) and the hero image can be preloaded.

## Data model (types and interfaces)

```ts
// services/schemas/movie-schema.ts
export const TmdbMovieRawSchema = /* existing fields, plus: */ {
  backdrop_path?: string | null;   // optional: existing fixtures stay valid
  overview?: string;
  genre_ids?: number[];
};

// Hero-only data. Movie (the card's shape) is NOT widened.
export interface FeaturedMovie {
  id: number;
  title: string;
  overview: string;            // "" when TMDB sends none (the synopsis is then omitted, RF-16)
  backdropUrl: string;         // built from the "original" size (RF-33)
  genreIds: number[];
  releaseYear: number | null;
  rating: number | null;       // same rule as the card: null → "No rating"
}

export function pickFeatured(raw: TmdbMovieRaw[], backdropBaseUrl: string): FeaturedMovie | undefined;

// services/explore-service.ts  and  services/explore-client.ts (browser schema)
export interface MoviePage {
  movies: Movie[];
  page: number;
  totalPages: number;
  featured?: FeaturedMovie;    // present only on popular page 1 with a backdrop; ABSENT otherwise
}

// hooks/useExploreMovies.ts
export interface UseExploreMoviesResult {
  /* existing fields … */
  featured: FeaturedMovie | null;   // the first page's, or null
}

// app/site-config.ts
export type SiteLinkId = "site" | "linkedin" | "github";
export interface SiteConfig {
  name: string;                          // "Movie-explorer"
  links: Record<SiteLinkId, string>;     // "" until the maintainer fills them
}
export interface SiteLink { id: SiteLinkId; label: string; href: string }
export function visibleLinks(config: SiteConfig): SiteLink[];   // only complete https addresses

// app/results-heading.ts and app/featured-genre.ts
export function resultsHeading(filters: ExploreFilters, genres: Genre[]): string;
export function firstGenreName(genreIds: number[], genres: Genre[]): string | null;

// components
export interface FeaturedHeroProps { movie: FeaturedMovie; genreName: string | null }
export interface HeroCurtainProps {
  open: boolean;
  onSettled?: () => void;               // curtain finished (or no animation)
  children: ReactNode;
}
export interface BackToTopButtonProps { visible: boolean; onActivate: () => void }
export function useBackToTopVisibility(sentinel: RefObject<Element | null>): boolean;
```

`featured` is **omitted, not `null`**, when there is none. That is deliberate:
the existing tests compare these page shapes with `toEqual`, and their fixtures
have no backdrop, so the shapes they expect stay exactly the same.

## Decisions

1. **The featured movie travels inside the popular page response**, as an
   optional `featured` field computed from that same response. *Rejected*: a
   second fetch or an `/api/featured` route — it breaks RF-7 (no extra request).
   *Rejected*: widening `Movie` with backdrop, overview and genres — every card
   and fixture would carry hero-only data, and the exact-shape tests would break.
   (RF-6, 7)
2. **`featured` is omitted when absent and its raw fields are optional.** TMDB
   always sends them; making them optional only keeps the existing fixtures and
   shape tests valid. *Rejected*: `featured: null` — it would change the shape the
   existing tests expect. (RF-9)
3. **Hero visibility is derived from state `ExplorerClient` already owns**
   (`searchText` and `filters`). The first character closes it, before the
   debounce, as decided. *Rejected*: deriving it from the URL only — the URL
   changes after the debounce and the server round trip, too late for RF-11.
   *Rejected*: a Zustand store — nothing is persisted, so constitution §6 does not
   ask for one. (RF-11)
4. **The hero lives inside `ExplorerClient`'s tree, not in `page.tsx`.** It must
   react to the search field. It is still server-rendered on the first paint
   because client components render on the server too. *Rejected*: a Server
   Component hero in `page.tsx` — it cannot react to typing. (RF-6, 11, 32)
5. **The curtain is a CSS transition of the hero's height plus movement and
   opacity**, as in the approved canvas, with `inert` and `aria-hidden` while
   closed. It is the documented exception to "transform and opacity only".
   *Rejected*: transform-only — the content below would jump when it ends.
   *Rejected*: no animation — drops an approved behavior. (RF-12, 13)
6. **Late data opens the curtain: the hero mounts collapsed and opens one frame
   later**, so the "hero arrives after the filters are cleared" case (RF-7) uses
   the same animation instead of popping in. *Rejected*: mounting it open — it
   would push the grid with no transition. (RF-7, 12)
7. **Scroll settling keeps the existing call and adds one.** The `scrollIntoView`
   of explore-filters RF-19 stays exactly as it is; when a filter change closes
   the hero, `ExplorerClient` calls it once more when the curtain settles (at once
   with reduced motion). It is the same call, so the existing test is untouched,
   and with no hero the extra call never happens. *Rejected*: relying on the
   browser's scroll anchoring alone — unreliable during a height animation.
   *Rejected*: replacing the original call — it would alter RF-19's test. (RF-12)
8. **One `<main>` in the layout; the pages drop theirs.** The skip link then
   always has a target, including on the default not-found page, which today has
   no landmark. *Rejected*: an id per page — the pages without a `main` have
   nothing to point at. *Rejected*: leaving nested mains — invalid. (RF-5)
9. **The header renders two layout variants and CSS shows one**, so the keyboard
   order equals the visual order at every width (the wide order is brand, links,
   external icons; the narrow one is brand, icons, links). A hidden variant is
   removed from the accessibility tree and from the tab order. *Rejected*:
   reordering one markup with CSS (`order`/grid areas) — the DOM order would
   differ from the visual one at one of the two widths. *Rejected*: swapping with
   `matchMedia` — a hydration mismatch. (RF-4)
10. **Only `HeaderNav` is a client component** (it needs the pathname), and it is
    still server-rendered with the right `aria-current`. *Rejected*: making the
    whole header client-side — more JavaScript for nothing. (RF-2)
11. **The three addresses live in `app/site-config.ts`**, validated by a pure
    function that keeps only complete `https` addresses. *Rejected*: environment
    variables — they are public, and changing them would need a redeploy of
    configuration for no gain. *Rejected*: hard-coding in the header — no single
    place to edit and no validation. (RF-3)
12. **The background is a fixed layer drawn by CSS** (gradient and glow from
    tokens), sized to the large viewport so a phone's browser bar does not make it
    jump. *Rejected*: `background-attachment: fixed` — jank on phones and unreliable
    on iOS. *Rejected*: an image or a grain texture — extra weight, and the grain
    is out of scope. (RF-27, 28)
13. **Every value of Appendix A becomes a token in `design.md` and `@theme`.**
    *Rejected*: arbitrary values in the classes — `design.md` forbids them.
    *Rejected*: snapping to the existing scale — it would alter the approved
    canvas. (all visual RF)
14. **The card's hover uses the framework's hover variant** (already limited to
    pointers that can hover), an enlargement only under `motion-safe`, a
    transparent border at rest, and a raised stacking order while hovered. The
    keyboard focus indicator is not touched. *Rejected*: JavaScript hover
    handlers — slower and wrong on touch. *Rejected*: a shadow as the border — it
    disappears in forced-colors mode. *Rejected*: enlarging on focus — motion for
    every Tab stop. (RF-23)
15. **The back-to-top button observes a sentinel with `IntersectionObserver`.**
    *Rejected*: a scroll listener — the playbook forbids it and it costs input
    delay. The hook sits in `hooks/` next to the other non-Query hooks. (RF-24)
16. **The heading text and the announcement come from one pure function**
    (`resultsHeading`). The announcement is a separate visually hidden live
    region, and the empty case is left to the existing empty state so it is not
    read twice. *Rejected*: making the heading itself live — it would re-announce
    on every filter tweak and on infinite-scroll renders. (RF-21, 22)
17. **The bar is restyled without touching `ClearFiltersButton`.** The reserved
    room is a placeholder inside `FilterBar`, so the button's own test (renders
    nothing when not visible) and `FilterBar`'s test (the button is absent when
    hidden) keep passing. Labels become visually hidden but stay real `<label>`s,
    so every accessible name and test lookup is the same. *Rejected*: changing the
    button to render a hidden element — it would edit an existing test's
    expectation. (RF-18, 19, 20)
18. **The hero image is a `next/image` with priority, `sizes` of the full width,
    quality 85 and an empty description, built from TMDB's `original` size by a
    pure helper** (not by changing the shared image configuration). *Rejected*: a
    CSS background image — the browser finds it late and it cannot be prioritized
    like an image. *Rejected*: a 1280 px source — it would be stretched on wide
    screens, which the maintainer ruled out. *Rejected*: changing
    `tmdb-config.ts` — it has its own tests. (RF-17, 32, 33)
19. **The hero's dark layer is defined as CSS custom properties, and a test
    computes the contrast against pure white** for the text positions at 1280,
    1440 and 1920 px. *Rejected*: judging it by eye — Lighthouse cannot measure
    text over images. (RF-17, 29)
20. **The skeletons keep their `animate-pulse` class** (an existing test counts
    exactly three) and gain `motion-reduce:animate-none`, so with reduced motion
    the pulse is off, not merely fast. *Rejected*: renaming the class — it would
    break that test; *rejected*: trusting the global reduced-motion rule — it only
    shortens the duration, and an infinite animation keeps repeating. (RF-36)
21. **New icons follow `design.md`** (one component per icon, 24 × 24, stroke
    1.5, `currentColor`, decorative ones hidden). Those that exist in the canvas
    (star, arrows, chevron, clapperboard and the three header glyphs) are taken
    from it; the alert and film icons are not in the canvas and are drawn in the
    same style. The three header icons are replaced by the maintainer's own when
    supplied. *Rejected*: an
    icon library — constitution §1. (RF-3, 35)
22. **Metadata uses a title template and a default in the layout**, with the
    home's and the About page's own entries. The detail page inherits the site
    title until the audit spec. *Rejected*: per-page titles for the detail page —
    out of scope. (RF-34)
23. **The About page is a static Server Component**; the TMDB logo is a static
    asset supplied by the maintainer, shown with `next/image` (an SVG is served
    unoptimized). *Rejected*: hot-linking TMDB's logo — an external dependency and
    a privacy leak. (RF-30)
24. **Layout and look are checked in a real browser, logic in jsdom.** The
    end-to-end specs use Playwright's Chromium (bounding boxes, computed styles,
    hover, emulated reduced motion, JavaScript disabled); Vitest covers the pure
    helpers and component structure. The four aspects of the scoped exception are
    recorded demonstrations. (all)
25. **Order of work follows the spec's phases**: housekeeping and `design.md`
    first, then what costs nothing visible (data, tokens, icons, skeleton and
    metadata fixes), then the shell, then the bar and results, then the hero, then
    the measurements.

## Rollout order (the order matters)

1. **Before any code:** `design.md` updated and approved; the reference
   Lighthouse measurement of the deployed home; the housekeeping commits
   (deletion of `resolve-view-state`, the debounce test).
2. **Foundations (no visible change):** schema and service extension with their
   tests; tokens in `globals.css`; the icons; the skeleton and card structure
   (transparent border, motion-reduce); metadata; priority on the first posters.
3. **Shell:** layout `main` and skip link; header (needs the maintainer's three
   addresses and icons, or explicit approval to ship with the file empty); the
   background; the About page (needs the TMDB logo); README attribution.
4. **Explorer composition:** bar restyle and reserved room; results heading and
   announcer; back-to-top; card hover.
5. **Hero:** `FeaturedHero`, `HeroCurtain`, the wiring in `ExplorerClient`, the
   scroll settling.
6. **Verification:** end-to-end specs, the audit checklist pass, Lighthouse on the
   public address, the real-device checks and the recorded demonstrations.

Each phase is merged through its own pull request(s), so the checks and the
deployment verification of the previous spec cover every step.

## Risks

1. **Scroll position after a filter change with the hero open (RF-12).** The
   browser computes the first `scrollIntoView` before the hero shrinks.
   Mitigation: the settle call of decision 7, an end-to-end measurement at 450 ms,
   a real-browser check. If it is still wrong, the approach is decided again with
   the maintainer; no existing test is edited.
2. **The curtain animates layout.** Cost: reflow for 400 ms after an action; it
   never runs while the page loads. Mitigation: the Performance panel is checked
   for long tasks during the animation, and reduced motion removes it.
3. **The `original` backdrop is heavy.** The first request builds the optimized
   copy on the server; free-plan image limits apply. Mitigation: full-width
   `sizes`, quality 85, caching, measurement; if LCP or the quota suffer, a smaller
   source is proposed to the maintainer, not chosen silently.
4. **The late-data case (landing on a filtered URL, then clearing).** The hero
   opens after the list arrives, which can shift the grid more than 500 ms after
   the click. Mitigation: it uses the curtain (decision 6) and the case is rare
   (a shared filtered link); covered by a test and a real-browser look.
5. **Existing exact-shape tests.** `toEqual` on page shapes would fail if a
   fixture ever carried a backdrop. Mitigation: `featured` is omitted when absent;
   the first task runs the full suite before and after. If a test would need to
   change, it stops and asks.
6. **One `<main>` for every page.** A page that forgets to drop its own creates a
   nested main. Mitigation: an end-to-end check counts `main` landmarks on `/`,
   `/about`, a movie and a not-found page.
7. **The header's two variants.** Mistakes would duplicate links for assistive
   technology. Mitigation: `display: none` removes the hidden one from the tab
   order and the accessibility tree; tests at 390 and 1280 px count the links.
8. **Contrast over the glow, the tints and a real image (RF-17, 29).** Lighthouse
   cannot check these. Mitigation: the computed test with pure white, plus the
   recorded demonstration on real images; the detail page's text over the new
   background is checked by hand.
9. **The enlarged card clipped or covered (RF-23).** Mitigation: a raised
   stacking order while hovered, the end-to-end test checks which element is on
   top at the card's corners and that neighbors do not move.
10. **The fixed background on iOS Safari.** Mitigation: sized to the large
    viewport; without support the page falls back to a plain dark background;
    checked on a real device (recorded demonstration).
11. **Maintainer-supplied assets block two tasks** (the three addresses and icons
    for the header; the TMDB logo for the About page). Mitigation: those tasks are
    marked manual and ordered after the rest; temporary canvas glyphs stand in.
12. **Lighthouse noise.** Scores move by about ±5. Mitigation: the median of five
    runs, the same method before and after.
13. **Heading order.** A new `h1` and several `h2`s on the home. Mitigation: a test
    asserts one `h1` and no skipped levels on `/` and `/about`.
14. **The end-to-end suite uses the live TMDB API** (like the existing ones) and is
    not a required check. Mitigation: logic that must not flake is in jsdom; the
    end-to-end specs are run locally and their results noted.

## Test strategy

**Existing tests that could be affected, and how each is respected** (none is
edited without the maintainer's approval):

| Existing test | Constraint | What the plan does |
|---|---|---|
| `services/explore-service.test.ts`, `services/explore-client.test.ts`, `app/api/explore/route.test.ts` (`toEqual` on page shapes) | Shapes must not gain keys | `featured` omitted when absent; new cases added |
| `components/MovieCardSkeleton.test.tsx` (exactly three `.animate-pulse`) | Keep the class on the same three blocks | `motion-reduce:animate-none` added, class not renamed |
| `components/MovieCard.test.tsx` (no `img` role when no poster) | The fallback must not be an image | the film icon is decorative (`aria-hidden`) |
| `components/ClearFiltersButton.test.tsx` (renders nothing when not visible) | Component unchanged | the reserved room lives in `FilterBar` |
| `components/FilterBar.test.tsx` (button absent when hidden, tab order) | Same DOM order, no button when hidden | placeholder is an empty, hidden element |
| `app/ExplorerClient.test.tsx` (RF-19 `scrollIntoView`, `results-anchor`, Tab order) | Call and test id kept; Tab order kept | one extra call only when a hero closes; tests have no hero |
| `e2e/popular-movies.spec.ts` (counts `article` ≤ 20) | The hero must not be an `article` | the hero is a `section` |
| `app/globals.test.ts` | Existing tokens stay | only additions |
| `app/resolve-view-state.test.ts` | — | deleted with its file (approved) |

**Unit and component (Vitest, Testing Library, MSW):**
- Pure helpers with every branch: `pickFeatured`, `firstGenreName`,
  `resultsHeading`, `visibleLinks` (empty, malformed, `http`, other schemes),
  the backdrop URL helper.
- Service and route: the popular page 1 carries `featured`, later pages and other
  modes do not; **one** TMDB request per page (a request counter); the client
  schema accepts and rejects.
- Components: `FeaturedHero` (content, omitted genre and synopsis, "No rating",
  title as written, capitals by style only, image failure keeps the text);
  `HeroCurtain` (`inert` and `aria-hidden` while closed, focus rescue, late-data
  open, settle callback); header variants (link count, order per variant,
  `aria-current`); skip link; bar and reserved room; announcer (no duplicate with
  the empty state); back-to-top (hidden, unfocusable, shown) with the existing
  `MockIntersectionObserver`; card (fallback, icon, classes), icons decorative.
- `ExplorerClient`: first typed character closes the hero before the debounce;
  clearing reopens it; a filtered start has no hero and clearing it shows one
  without extra requests.
- Tokens: `globals.test.ts` additions for the new tokens, the reduced-motion
  rules and the scrim values; a **contrast test** computing the token pairs and the
  hero text against pure white at 1280, 1440 and 1920 px.

**End-to-end (Playwright, a new `e2e/home-redesign.spec.ts`):**
header on every page and the skip link (first Tab, focus on activation, one
`main` per page); tab order equals visual order at 390 and 1280 px; 320 px
(brand text hidden, no horizontal scroll); hero visible on `/`, closing and
reopening, the scroll position after a filter change (450 ms), `Details`
navigation; hover on a card (border color, scale, neighbors unmoved, topmost
element at the corners); the back-to-top button (appears, moves focus to the
heading); the bar at both widths (computed heights and font size, no movement when
"Clear filters" toggles); a run with reduced motion emulated (no curtain, no
enlargement, skeletons without animation); a run with JavaScript disabled (header,
skip link, hero, About); one `h1` and no skipped heading levels.

**Recorded demonstrations (the scoped exception):** smoothness of the curtain
(RF-12), the device's and the browser's reserved areas (RF-26), the background with
a phone's browser bar (RF-27), contrast over real images (RF-29). Plus the real
device checks listed in the spec's definition of done.

**Measurements:** Lighthouse on the deployed home before (reference) and after, on
the home and the About page, mobile and desktop, median of five; an accessibility
checker on every state of the home; keyboard, screen reader (VoiceOver), 200 %
text and 400 % zoom, 320 px, reduced motion and forced colors.

## Coverage matrix (RF → part → verification)

| RF | Part | Verification |
|---|---|---|
| RF-1 | `layout.tsx`, `SiteHeader` | component test; e2e on `/`, `/about`, a movie, a not-found page |
| RF-2 | `HeaderNav` | component test (mocked pathname); e2e |
| RF-3 | `site-config`, header links | unit (`visibleLinks`); component (new tab, accessible name, hidden when empty) |
| RF-4 | header variants | component (order per variant); e2e at 390, 1280 and 320 px |
| RF-5 | `SkipLink`, layout `main`, pages | component; e2e (first Tab, focus, one `main` per page) |
| RF-6 | `FeaturedHero`, `pickFeatured`, `firstGenreName` | unit; component; e2e |
| RF-7 | service, client schema, hook | service/route tests (one request); hook test (clear → popular → `featured`) |
| RF-8 | `MovieGrid` (no de-duplication added) | component/e2e: the featured movie is also a card in its own position |
| RF-9 | `featured` omitted, `HeroCurtain` not rendered | service and `ExplorerClient` tests; e2e with the error state |
| RF-10 | `FeaturedHero` image error | component (image error event) |
| RF-11 | derived `heroOpen` | `ExplorerClient` tests (first character, filters, clear) |
| RF-12 | `HeroCurtain`, settle call, `globals.css` | component; e2e (450 ms position, reduced motion); **demonstration** for smoothness |
| RF-13 | `HeroCurtain` | component (`inert`, `aria-hidden`, focus rescue); e2e |
| RF-14 | `FeaturedHero` styles | e2e (computed `text-transform`, accessible name as written) |
| RF-15 | home `h1`, hero `h2` | component; e2e (one `h1`, no skipped levels) |
| RF-16 | `FeaturedHero`, `pickFeatured` | unit/component (omitted genre, empty synopsis, "No rating") |
| RF-17 | scrim properties, `FeaturedHero` | computed contrast test at 1280/1440/1920 px; **demonstration** on real images; component (empty alt) |
| RF-18 | `SearchFiltersBar`, `FilterBar` | component; e2e at both widths |
| RF-19 | `FilterBar` placeholder | component (placeholder present, button absent); e2e (no movement) |
| RF-20 | bar components, tokens | e2e (computed heights and font size) |
| RF-21 | `resultsHeading` | unit (every branch); component |
| RF-22 | `ResultsAnnouncer` | component (text, politeness, no duplicate with empty state) |
| RF-23 | `MovieCard`, `globals.css` | component (classes, fallback); e2e (hover styles, neighbors, topmost element); reduced-motion run |
| RF-24 | `useBackToTopVisibility`, button | hook test (observer mock); component; e2e |
| RF-25 | `ExplorerClient` handler | component/e2e (scroll target, focus on the heading, reduced motion) |
| RF-26 | button position, scroll padding | e2e (does not cover the focused element); **demonstration** on a real phone |
| RF-27 | fixed layer in `globals.css` | `globals.test.ts`; e2e (stays while scrolling); **demonstration** on iOS Safari |
| RF-28 | tints, mask, no borders | e2e (computed borders); `globals.test.ts` |
| RF-29 | tokens, tints, glow | contrast test over the token pairs and pure white; **demonstration** on real images; manual check of the detail page |
| RF-30 | `/about`, `TmdbAttribution` | component; e2e |
| RF-31 | `README.md` | root-level text test (statement and logo reference) |
| RF-32 | `FeaturedHero`, `MovieGrid`, `MovieCard` | component (priority attributes, no lazy loading); e2e; Lighthouse |
| RF-33 | backdrop helper, `sizes` | unit (the large size, full-width `sizes`); Lighthouse (image audits) |
| RF-34 | layout, home and About metadata | unit on the exported metadata; e2e (page titles) |
| RF-35 | icons, `RatingBadge`, `ErrorState`, `EmptyState`, `MovieCard` | component (icon present, decorative, fallback keeps no `img`) |
| RF-36 | `MovieCardSkeleton` | component (class kept, `motion-reduce`); e2e reduced-motion run (no animation) |

**Non-functional requirements:** the audit checklist, Lighthouse and the
accessibility pass are the measurements above; "without JavaScript" is the e2e
run; "no dependency added" is checked on the dependency sections of
`package.json` against the base commit, as in the previous spec; tokens are
covered by `globals.test.ts` and the review of the class names against
`design.md`.

## Constitution check

| Rule | How the plan meets it |
|---|---|
| §1 Minimal stack | No dependency: inline SVG icons, CSS transitions, the browser's `IntersectionObserver` |
| §2 Spec before code | Spec approved; `design.md` approved before the first task; one pull request per phase referencing the spec |
| §3 Data flow | The hero's data comes through `services/` (server) and `/api/explore` + `explore-client` + the hook (browser); components fetch nothing |
| §4 Validated boundaries | The raw schema and the browser schema are extended and parsed with Zod; no `any` |
| §5 Tested requirements | The matrix above; the four-aspect exception is the one the spec declares, with recorded demonstrations |
| §6 No own backend | No new server code; no store; the proxy route is unchanged |
| §7 Accessible by default | The audit checklist per change; keyboard order, names, landmarks, reduced motion and forced colors are planned and tested |
| §8 Performance | `next/image` everywhere, priority on the first-paint images, Lighthouse ≥ 90 on the public address against a fresh reference |
| §9 English everywhere | All text, code and documentation in English |

## Requirements not covered

**None.** Every RF from RF-1 to RF-36 has a part and a verification in the matrix.
Four aspects (RF-12 smoothness, RF-26, RF-27, RF-29 on real images) are covered
by recorded demonstrations under the scoped exception of the spec, besides the
automated checks listed for them. Two parts depend on material only the
maintainer can provide (the three addresses and icons for RF-3, the TMDB logo for
RF-30); until then they are implemented with temporary canvas glyphs or an empty
configuration, as the spec allows.
