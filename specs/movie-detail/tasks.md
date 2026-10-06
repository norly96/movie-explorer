# Tasks — Movie detail page (core)

15 tasks, ordered by dependency. `[P]` = does not depend on any pending
task in its own phase and can be done in parallel with the other `[P]`
tasks in that phase.

## Phase 0 — Refactor foundation

- [ ] **T01 — Extract tmdb-mappers.ts from movie-schema.ts**
  - Depends on: —
  - Files: `services/schemas/tmdb-mappers.ts`, `services/schemas/tmdb-mappers.test.ts`, `services/schemas/movie-schema.ts` (modified), `services/schemas/movie-schema.test.ts` (must still pass unmodified)
  - RF: — (refactor; prerequisite for RF-1, RF-2, RF-3, RF-5, RF-6 via T02)
  - Done when: `extractReleaseYear`/`toRating` move to `tmdb-mappers.ts` with their own tests; `movie-schema.ts` imports them instead of defining them locally; Spec 1's `movie-schema.test.ts` passes without any change to its assertions.

## Phase 1 — Independent leaves

- [ ] **T02 [P] — movie-detail-schema.ts**
  - Depends on: T01
  - Files: `services/schemas/movie-detail-schema.ts`, `services/schemas/movie-detail-schema.test.ts`
  - RF: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6
  - Done when: tests cover a full raw object mapping correctly; missing poster/backdrop/tagline/overview/homepage and `runtime: 0` all map to `null`; cast capped at 12 ordered by `order`, `[]` when none; zero/one/multiple directors map to `[]`/one name/joined names; trailer selection picks `type: "Trailer"` + `site: "YouTube"` only, official first; gallery capped at 12 backdrops.

- [ ] **T03 [P] — TrailerEmbed component**
  - Depends on: —
  - Files: `components/TrailerEmbed.tsx`, `components/TrailerEmbed.test.tsx`
  - RF: RF-4, RF-6, RF-13
  - Done when: renders a `youtube-nocookie.com` iframe with the given key, a descriptive `title`, `loading="lazy"` (mitigates the third-party-performance risk in `plan.md`), and is keyboard-reachable; renders nothing when `trailerKey` is `null`.

- [ ] **T04 [P] — Gallery component**
  - Depends on: —
  - Files: `components/Gallery.tsx`, `components/Gallery.test.tsx`
  - RF: RF-5, RF-6
  - Done when: renders one image per URL given via `next/image` (not a plain `<img>`); renders nothing when the array is empty.

- [ ] **T05 [P] — MovieDetailSkeleton component**
  - Depends on: —
  - Files: `components/MovieDetailSkeleton.tsx`, `components/MovieDetailSkeleton.test.tsx`
  - RF: RF-11
  - Done when: renders placeholder blocks for hero/cast/trailer/gallery, `aria-hidden="true"`.

- [ ] **T06 [P] — ErrorState: add retryHref**
  - Depends on: —
  - Files: `components/ErrorState.tsx`, `components/ErrorState.test.tsx`
  - RF: RF-10
  - Done when: default `retryHref` stays `"/"` (Spec 1's existing test passes unmodified); passing `retryHref="/movie/42"` renders "Try again" pointing there instead.

- [ ] **T07 [P] — MovieCard: wrap in Link**
  - Depends on: —
  - Files: `components/MovieCard.tsx`, `components/MovieCard.test.tsx`
  - RF: RF-7
  - Done when: the card is wrapped in a `Link` to `/movie/{id}`; Spec 1's existing `MovieCard.test.tsx` assertions and `MovieGrid.test.tsx`'s `getAllByRole("article")` still pass unmodified.

- [ ] **T08 [P] — not-found.tsx page**
  - Depends on: —
  - Files: `app/movie/[id]/not-found.tsx`, `app/movie/[id]/not-found.test.tsx`
  - RF: RF-9
  - Done when: renders a "Movie not found" message styled with `design.md` tokens; test asserts the message renders.

## Phase 2 — Schema-dependent components

- [ ] **T09 [P] — MovieHero component**
  - Depends on: T02
  - Files: `components/MovieHero.tsx`, `components/MovieHero.test.tsx`
  - RF: RF-1, RF-6, RF-12
  - Done when: renders poster/backdrop/title/tagline/year/runtime/genres/rating when present, omits each gracefully when `null`/empty; poster and backdrop render via `next/image` (not a plain `<img>`) with descriptive `alt` text.

- [ ] **T10 [P] — MovieInfo component**
  - Depends on: T02
  - Files: `components/MovieInfo.tsx`, `components/MovieInfo.test.tsx`
  - RF: RF-1, RF-6
  - Done when: renders overview/status/original language/homepage link when present, omits each gracefully when `null`/empty.

- [ ] **T11 [P] — CastList component**
  - Depends on: T02
  - Files: `components/CastList.tsx`, `components/CastList.test.tsx`
  - RF: RF-2, RF-3, RF-6, RF-12
  - Done when: renders up to 12 cast members (photo via `next/image`, not a plain `<img>`, name, character); renders the director line, correctly joined for 2 ("A & B") and 3+ ("A, B & C"); the whole section is omitted when cast is empty; cast photos have descriptive `alt` text.

## Phase 3 — Service layer

- [ ] **T12 — movie-detail-service.ts**
  - Depends on: T02
  - Files: `services/movie-detail-service.ts`, `services/movie-detail-service.test.ts`
  - RF: RF-4, RF-9, RF-10
  - Done when: MSW-backed tests cover: valid response → `ok:true`; 404 → `ok:false, reason:"not_found"`; other HTTP error → `ok:false, reason:"http"` with status; network failure → `ok:false, reason:"network"`; invalid shape → `ok:false, reason:"invalid_response"`; a response with no `en-US` trailer triggers the language-fallback request, whose response is validated through the same schema as the primary request (not treated as a special, unvalidated case), and picks up a trailer found there.

## Phase 4 — Composition

- [ ] **T13 — app/movie/[id]/loading.tsx**
  - Depends on: T05
  - Files: `app/movie/[id]/loading.tsx`
  - RF: RF-11
  - Done when: renders `MovieDetailSkeleton`; verified visually in `pnpm dev` (no committed test, same pattern as Spec 1's `loading.tsx`).

- [ ] **T14 — app/movie/[id]/page.tsx (integration)**
  - Depends on: T06, T08, T09, T10, T11, T03, T04, T12
  - Files: `app/movie/[id]/page.tsx`
  - RF: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-8, RF-9, RF-10 (composition point)
  - Done when: `pnpm dev` on a real `/movie/{id}` shows every section; a syntactically valid but non-existent id (e.g. `/movie/999999999`) shows `not-found.tsx`; a syntactically invalid id (e.g. `/movie/abc`) also shows `not-found.tsx`, tested as its own case; a simulated TMDB failure shows `ErrorState` with `retryHref` pointing at the same id.

## Phase 5 — End to end

- [ ] **T15 — E2E happy path + not found**
  - Depends on: T07, T14
  - Files: `e2e/movie-detail.spec.ts`
  - RF: RF-1, RF-2, RF-3, RF-4, RF-5, RF-7, RF-8, RF-9
  - Done when: `pnpm test:e2e` passes: clicking a `MovieCard` from home navigates to its detail page (RF-7) showing hero/cast/trailer/gallery; a direct visit to that same URL with no prior navigation renders identically (RF-8); visiting an invalid id directly shows "Movie not found".
