# Tasks — Popular movies list

19 tasks, ordered by dependency. `[P]` = does not depend on any pending
task in its own phase and can be done in parallel with the other `[P]`
tasks in that phase.

## Phase 0 — Tooling

- [x] **T01 — Testing setup (Vitest + Testing Library + MSW)**
  - Depends on: —
  - Files: `package.json`, `vitest.config.ts`, `vitest.setup.ts`, `mocks/server.ts`
  - RF: — (infrastructure for every later test)
  - Done when: `pnpm test` runs with zero test files, no config errors.

- [x] **T02 [P] — Playwright setup**
  - Depends on: —
  - Files: `package.json`, `playwright.config.ts`, `e2e/smoke.spec.ts`
    (minimal placeholder test, no app logic — Playwright has no
    "pass with zero tests" mode like Vitest; superseded by T19's
    `e2e/popular-movies.spec.ts`, not deleted until then)
  - RF: — (infrastructure for T19)
  - Done when: `pnpm test:e2e` runs the placeholder smoke test and passes, with no config errors.

## Phase 1 — Independent leaves

- [x] **T03 [P] — next.config.ts: allow TMDB images**
  - Depends on: —
  - Files: `next.config.ts`, `next.config.test.ts`
  - RF: RF-2
  - Done when: `images.remotePatterns` includes `image.tmdb.org`; `pnpm build` doesn't fail on the config.

- [x] **T04 [P] — .env.example**
  - Depends on: —
  - Files: `.env.example`
  - RF: RF-7 (supporting doc)
  - Done when: File documents `TMDB_ACCESS_TOKEN=` with a one-line comment; no real token committed.

- [x] **T05 [P] — Movie schema + mapper**
  - Depends on: T01
  - Files: `services/schemas/movie-schema.ts`, `services/schemas/movie-schema.test.ts`
  - RF: RF-2, RF-3
  - Done when: Tests cover: valid raw movie → mapped `Movie`; `poster_path: null` → `posterUrl: null`; `release_date: ""` → `releaseYear: null`; `vote_count: 0` → `rating: null`; `vote_count > 0` → numeric `rating`. All green.

- [x] **T06 [P] — TMDB config (env validation + `server-only` guard)**
  - Depends on: T01
  - Files: `services/tmdb-config.ts`, `services/tmdb-config.test.ts`
  - RF: RF-7
  - Done when: Test asserts a clear thrown error when `TMDB_ACCESS_TOKEN` is unset, and correct values returned when set.

- [x] **T07 [P] — No-secret-leak static test**
  - Depends on: T06
  - Files: `services/no-secret-leak.test.ts`
  - RF: RF-7
  - Done when: Test fails if the string `TMDB_ACCESS_TOKEN` appears outside `services/`; currently passes.

- [x] **T07.5 — Apply design.md tokens to globals.css**
  - Depends on: T01
  - Files: `app/globals.css`, `app/globals.test.ts`, `app/layout.tsx`
  - RF: — (prerequisite for every visual component: T08-T12, T14, T16, T17)
  - Not in the original plan/tasks breakdown — added mid-implementation
    (user-approved) once it became clear no task applied design.md's
    `@theme` tokens, and AGENTS.md's Hard rules forbid components from
    using colors/sizes outside that file.
  - Done when: `globals.css` defines the token set from `design.md`
    (`--color-surface`, `--color-muted`, `--color-danger`, `--color-accent`,
    `--radius-sm`, `--radius-md`, `--aspect-poster`, focus-visible outline,
    reduced-motion override); `layout.tsx` applies dark `color-scheme` and
    the Geist sans font. Verified by reading the generated CSS content.

- [x] **T08 [P] — EmptyState component**
  - Depends on: T01
  - Files: `components/EmptyState.tsx`, `components/EmptyState.test.tsx`
  - RF: RF-4
  - Done when: Renders default "No movies found" message; renders a custom `message` prop when provided.

- [x] **T09 [P] — ErrorState component**
  - Depends on: T01
  - Files: `components/ErrorState.tsx`, `components/ErrorState.test.tsx`
  - RF: RF-5
  - Done when: Renders default and custom messages, with a "Try again" action per `design.md`.

- [x] **T10 [P] — MovieCardSkeleton component**
  - Depends on: T01
  - Files: `components/MovieCardSkeleton.tsx`, `components/MovieCardSkeleton.test.tsx`
  - RF: RF-6
  - Done when: Renders placeholder blocks matching `MovieCard`'s poster/title/metadata structure.

- [x] **T11 [P] — app/error.tsx boundary**
  - Depends on: T01
  - Files: `app/error.tsx`
  - RF: RF-5 (defense-in-depth, unexpected exceptions)
  - Done when: Follows the Next.js error-boundary convention (`'use client'`, `reset` prop); manually triggering a thrown error in dev renders it.

## Phase 2 — First-level dependents

- [x] **T12 [P] — RatingBadge component**
  - Depends on: T05
  - Files: `components/RatingBadge.tsx`, `components/RatingBadge.test.tsx`
  - RF: RF-1 (card content)
  - Done when: Renders "X.X" with the a11y label from `design.md` for a numeric rating; renders "No rating" when `rating` is `null`.

- [x] **T13 — tmdb-service.ts**
  - Depends on: T05, T06
  - Files: `services/tmdb-service.ts`, `services/tmdb-service.test.ts`
  - RF: RF-1, RF-5
  - Done when: MSW-backed tests cover: valid response → `ok:true` with mapped movies; malformed response → `ok:false, reason:"invalid_response"`; HTTP error → `ok:false, reason:"http"` with status; network failure → `ok:false, reason:"network"`.

## Phase 3 — Second-level dependents

- [x] **T14 — MovieCard component**
  - Depends on: T05, T12
  - Files: `components/MovieCard.tsx`, `components/MovieCard.test.tsx`
  - RF: RF-2, RF-3
  - Done when: Renders the poster when `posterUrl` is set; renders the placeholder when `null`; renders the year when present and omits it when `null`, without breaking the layout.

- [x] **T15 — resolve-view-state.ts**
  - Depends on: T13
  - Files: `app/resolve-view-state.ts`, `app/resolve-view-state.test.ts`
  - RF: RF-4, RF-5
  - Done when: Empty array → `{kind:"empty"}`; `ok:false` → `{kind:"error", message}`; non-empty array → `{kind:"grid", movies}`.

## Phase 4 — Composition

- [x] **T16 — MovieGrid component**
  - Depends on: T14
  - Files: `components/MovieGrid.tsx`, `components/MovieGrid.test.tsx`
  - RF: RF-1
  - Done when: Renders one `MovieCard` per movie for a given `movies` array (e.g. 3 movies → 3 cards).

- [x] **T17 — app/loading.tsx**
  - Depends on: T10
  - Files: `app/loading.tsx`
  - RF: RF-6
  - Done when: Renders a grid of `MovieCardSkeleton` matching the page's grid layout; verified visually in `pnpm dev`.

- [x] **T18 — app/page.tsx (integration)**
  - Depends on: T13, T15, T16, T08, T09
  - Files: `app/page.tsx`
  - RF: RF-1, RF-4, RF-5, RF-6, RF-7 (composition point)
  - Done when: `pnpm dev` on `/` shows the grid on the happy path; temporarily breaking the token/URL shows `ErrorState`; an empty mocked response shows `EmptyState`.

## Phase 5 — End to end

- [x] **T19 — E2E happy path**
  - Depends on: T02, T03, T18
  - Files: `e2e/popular-movies.spec.ts`
  - RF: RF-1, RF-6
  - Done when: `pnpm test:e2e` passes: visiting `/` eventually shows movie cards.
