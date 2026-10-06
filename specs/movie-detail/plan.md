# Plan — Movie detail page (core)

## Modules

| Module | File | Responsibility |
|---|---|---|
| Shared mappers | `services/schemas/tmdb-mappers.ts` | **Refactor**: extracts `extractReleaseYear`/rating-null logic out of `movie-schema.ts` so both schemas share one rule. |
| Raw schema + mapper | `services/schemas/movie-detail-schema.ts` | Zod schema for `/movie/{id}` + `credits`/`videos`/`images`; maps to the domain `MovieDetail`. |
| Detail client | `services/movie-detail-service.ts` | `getMovieDetails(id)`. Distinguishes 404 (`not_found`) from other failures; fires the language-fallback video lookup when needed. |
| Route | `app/movie/[id]/page.tsx` | Server Component. Validates the id, calls the service, branches to `notFound()`, `ErrorState`, or the detail layout. |
| Not found | `app/movie/[id]/not-found.tsx` | RF-9's dedicated page, via Next's own convention. |
| Loading | `app/movie/[id]/loading.tsx` | RF-11, a new skeleton — not Spec 1's grid one. |
| Hero | `components/MovieHero.tsx` | Backdrop, poster, title, tagline, year, runtime, genres, rating. |
| Info | `components/MovieInfo.tsx` | Overview, status, original language, homepage link. |
| Cast | `components/CastList.tsx` | RF-2 (cap 12), RF-6 (hide if empty), RF-12 (alt text). |
| Trailer | `components/TrailerEmbed.tsx` | RF-4, RF-13 (keyboard-operable iframe). |
| Gallery | `components/Gallery.tsx` | RF-5 (cap 12 backdrops), RF-6. |
| Detail skeleton | `components/MovieDetailSkeleton.tsx` | Used by `loading.tsx`. |
| `MovieCard` | `components/MovieCard.tsx` | **Modified** (Spec 1): wraps existing markup in a `Link` to `/movie/{id}`. |
| `ErrorState` | `components/ErrorState.tsx` | **Modified** (Spec 1): adds an optional `retryHref` prop (default `/`). |
| Images config | `next.config.ts` | **No change** — cast/backdrop images are already on `image.tmdb.org`, covered by Spec 1's `remotePatterns`. |

## Component tree

```
app/movie/[id]/page.tsx (Server Component)
├─ (not found)  app/movie/[id]/not-found.tsx         — RF-9
├─ (loading)    app/movie/[id]/loading.tsx
│   └─ MovieDetailSkeleton                            — RF-11
├─ (error)      ErrorState retryHref="/movie/{id}"    — RF-10
└─ (resolved)
    ├─ MovieHero       (poster, backdrop, title, badges, RatingBadge reused)
    ├─ MovieInfo       (overview, status, language, homepage)
    ├─ CastList        (cast + director line)
    ├─ TrailerEmbed
    └─ Gallery

components/MovieCard.tsx  →  now <Link href="/movie/{id}"><article>...</article></Link>
```

## State and routes

- **Routes**: one new dynamic route, `/movie/[id]`. No `generateStaticParams` — TMDB's catalog is too large to pre-render; every id is rendered on demand.
- **State**: still none. No Zustand, no TanStack Query — fully server-rendered, consistent with Spec 1.
- **Caching**: `next: { revalidate: 86400 }` (24h) — a movie's details change far less often than a "popular" ranking (Spec 1 used 1h).

## Data model (types only)

```ts
// --- Raw TMDB shape ---
interface TmdbGenreRaw { id: number; name: string }

interface TmdbCastMemberRaw {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

interface TmdbCrewMemberRaw {
  id: number;
  name: string;
  job: string;
  profile_path: string | null;
}

interface TmdbVideoRaw {
  key: string;
  site: string;     // "YouTube" | "Vimeo" | ...
  type: string;     // "Trailer" | "Teaser" | ...
  official: boolean;
  name: string;
}

interface TmdbBackdropRaw { file_path: string }

interface TmdbMovieDetailRaw {
  id: number;
  title: string;
  original_title: string;
  tagline: string;          // "" when none
  overview: string;         // "" when none
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;     // "" when unknown
  runtime: number | null;   // 0 or null when unknown
  genres: TmdbGenreRaw[];
  vote_average: number;
  vote_count: number;
  status: string;
  original_language: string;
  homepage: string;         // "" when none
  credits: { cast: TmdbCastMemberRaw[]; crew: TmdbCrewMemberRaw[] };
  videos: { results: TmdbVideoRaw[] };
  images: { backdrops: TmdbBackdropRaw[] };
}

// --- Domain shape ---
interface CastMember {
  id: number;
  name: string;
  character: string;
  photoUrl: string | null;
}

interface MovieDetail {
  id: number;
  title: string;
  originalTitle: string | null;   // null when same as `title`
  tagline: string | null;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseYear: number | null;
  runtimeMinutes: number | null;  // null when 0/unknown (RF-6)
  genres: string[];
  rating: number | null;          // same convention as Spec 1's Movie
  status: string;
  originalLanguage: string;
  homepageUrl: string | null;
  cast: CastMember[];             // up to 12 (RF-2), [] if none (RF-6)
  directors: string[];            // names, [] if none (RF-6)
  trailerKey: string | null;      // YouTube key, null if none
  galleryUrls: string[];          // up to 12 backdrop URLs, [] if none
}

// --- Service boundary ---
type MovieDetailErrorReason =
  | "not_found" | "network" | "http" | "invalid_response";

interface MovieDetailError {
  reason: MovieDetailErrorReason;
  status?: number; // present when reason === "http"
}

type MovieDetailResult =
  | { ok: true; data: MovieDetail }
  | { ok: false; error: MovieDetailError };
```

### Module signatures (no bodies)

```ts
// services/schemas/tmdb-mappers.ts — extracted from movie-schema.ts
function extractReleaseYear(releaseDate: string): number | null;
function toRating(voteAverage: number, voteCount: number): number | null;

// services/schemas/movie-detail-schema.ts
const TmdbMovieDetailRawSchema: ZodType<TmdbMovieDetailRaw>;
function toMovieDetail(raw: TmdbMovieDetailRaw, imageBaseUrl: string): MovieDetail;

// services/movie-detail-service.ts
function getMovieDetails(id: number): Promise<MovieDetailResult>;
```

```ts
interface MovieHeroProps { movie: MovieDetail }
interface MovieInfoProps { movie: MovieDetail }
interface CastListProps { cast: CastMember[] }
interface TrailerEmbedProps { trailerKey: string | null }
interface GalleryProps { imageUrls: string[] }
// MovieDetailSkeleton: no props

// ErrorState — MODIFIED
interface ErrorStateProps { message?: string; retryHref?: string } // retryHref default "/"

// MovieCard — same props, now wraps its <article> in <Link href={`/movie/${movie.id}`}>
```

## Decisions (with the rejected alternative)

| # | Decision | Rejected alternative | Why |
|---|---|---|---|
| 1 | Extract `extractReleaseYear`/rating-null rule into shared `tmdb-mappers.ts` | Duplicate the same logic in the new schema | The two schemas would silently drift on the exact same business rule (`vote_count === 0` → unrated). |
| 2 | "Not found" maps to Next's `notFound()` + `not-found.tsx` convention | A hand-rolled `ViewState` union like Spec 1's `resolveViewState` | Mirrors how Spec 1 already used `loading.tsx`/`error.tsx` as framework conventions instead of inventing a state machine. |
| 3 | Reuse the existing root `app/error.tsx` for unexpected exceptions here too | A new `app/movie/[id]/error.tsx` | Next's error boundaries nest by segment; the root one already covers this route. A second one is pure duplication. |
| 4 | Extend `ErrorState` with an optional `retryHref` (default `/`) | A separate `MovieErrorState` component | Avoids duplicating the same markup for a one-line behavioral difference; Spec 1's usage is unaffected by the default. |
| 5 | Modify `MovieCard` in place — wrap its existing `<article>` in a `<Link>` | A new `MovieCardLink` wrapper component | One canonical card; keeps the `<article>` role so Spec 1's `MovieGrid.test.tsx` (`getAllByRole("article")`) doesn't need to change. |
| 6 | Embed the trailer via `youtube-nocookie.com` | Regular `youtube.com/embed` | No tracking cookie set until the visitor actually interacts with the player. |
| 7 | Gallery capped at 12 backdrops, first-N as TMDB returns them | Sort by some quality/popularity signal, or show all | TMDB's `/images` doesn't reliably rank by quality; an invented heuristic would be worse than none. Capping protects constitution §8 (performance). |
| 8 | Trailer's language-fallback is a second, conditional request — only fired when the `en-US` lookup returns no qualifying video | Always fetch videos unfiltered by language | Keeps the common case (an `en-US` trailer exists) at one request. |
| 9 | `revalidate: 86400` (24h) | Same 1h as Spec 1 | A movie's cast/trailer/images change far less often than a "popular" ranking. |

## Risks

- **Gallery ordering**: TMDB's `/images` doesn't guarantee a quality/relevance order — capping at 12 doesn't prevent obscure or duplicate shots from ranking first.
- **3+ co-directed films**: joining director names reads fine for two ("A & B") but needs explicit grammar handling for three or more ("A, B & C") — easy to get wrong if treated as a simple join.
- **Language-fallback latency**: movies without an `en-US`-tagged trailer pay for two TMDB requests instead of one.
- **Catalog-sized cache misses**: unlike Spec 1's one fixed list, every distinct movie id is its own cold cache entry — more unique TMDB requests over time, same class of rate-limit risk as Spec 1 but multiplied by catalog size.
- **Regression risk on shared components**: `MovieCard` and `ErrorState` are already shipped and tested (Spec 1); wrapping/extending them carries real risk of breaking `MovieGrid.test.tsx` or Spec 1's own `ErrorState.test.tsx` if not done carefully.
- **Third-party iframe performance**: an eagerly-loaded YouTube embed adds an external script/request that can affect Lighthouse metrics (constitution §8) if not deferred.

## Test strategy

| Test file | Covers |
|---|---|
| `services/schemas/movie-detail-schema.test.ts` | RF-1, RF-2, RF-3, RF-6 (every missing/empty field), video-selection priority for RF-4, gallery cap for RF-5 |
| `services/movie-detail-service.test.ts` (MSW) | RF-9 (404 → `not_found`), RF-10 (http/network/invalid_response), RF-4's language-fallback retry |
| `components/MovieHero.test.tsx` | RF-1, RF-6 (omits missing fields) |
| `components/MovieInfo.test.tsx` | RF-1, RF-6 |
| `components/CastList.test.tsx` | RF-2, RF-3, RF-6 (hidden when empty), RF-12 (alt text) |
| `components/TrailerEmbed.test.tsx` | RF-4, RF-6, RF-13 (keyboard-operable) |
| `components/Gallery.test.tsx` | RF-5, RF-6 |
| `components/MovieCard.test.tsx` (updated) | RF-7, and confirms Spec 1's RF-2/RF-3 don't regress |
| `components/ErrorState.test.tsx` (updated) | RF-10 (custom `retryHref`) |
| `app/movie/[id]/not-found.tsx` test | RF-9 |
| `e2e/movie-detail.spec.ts` (Playwright) | RF-1 through RF-5 happy path, RF-9 (invalid id), implicitly RF-8 (every E2E visit is a direct URL load) |

## RF coverage matrix

| RF | Covered by |
|---|---|
| RF-1 | `movie-detail-service.ts`/`movie-detail-schema.ts` + `MovieHero`/`MovieInfo` |
| RF-2 | `movie-detail-schema.ts` (cap/order) + `CastList` |
| RF-3 | `movie-detail-schema.ts` (directors) + `CastList` |
| RF-4 | `movie-detail-service.ts` (fallback) + `movie-detail-schema.ts` (selection) + `TrailerEmbed` |
| RF-5 | `movie-detail-schema.ts` (cap) + `Gallery` |
| RF-6 | `movie-detail-schema.ts` (null/empty mapping) + every component's conditional rendering |
| RF-7 | `MovieCard.tsx` (modified) |
| RF-8 | Inherent to `app/movie/[id]/page.tsx` being a Next.js route — no dedicated code; every E2E visit exercises it |
| RF-9 | `movie-detail-service.ts` (detects the 404 → `not_found`) + `app/movie/[id]/page.tsx` (id validation + branch) + `not-found.tsx` |
| RF-10 | `movie-detail-service.ts` (detects `http`/`network`/`invalid_response`) + `app/movie/[id]/page.tsx` (error branch) + `ErrorState` (modified) |
| RF-11 | `app/movie/[id]/loading.tsx` + `MovieDetailSkeleton` |
| RF-12 | `MovieHero`/`CastList` (`alt` on `next/image`) |
| RF-13 | `TrailerEmbed` (focusable iframe, no custom overlay blocking tab) |

## RF not covered

None — RF-1 through RF-13 all have at least one automated test (RF-8
ended up with its own dedicated E2E test in T15, better covered than
originally planned here). Two honest caveats found during the
post-implementation audit, neither blocking but both real test-gaps:

- **RF-9**: covers two distinct conditions (non-existent numeric id
  vs. syntactically invalid id). Only the first has a permanent
  automated test (`e2e/movie-detail.spec.ts`, `/movie/999999999`).
  The second (`/movie/abc`) was verified live exactly once during
  T14's manual check and was never turned into a committed test — a
  regression in the id-validation branch of `page.tsx` wouldn't be
  caught.
- **RF-10**: `movie-detail-service.test.ts` proves the service
  classifies errors correctly, and `ErrorState.test.tsx` proves the
  component accepts `retryHref` correctly — but nothing tests the
  actual wiring in `page.tsx` (that a service failure really renders
  `<ErrorState retryHref={\`/movie/${id}\`} />`). An attempt to verify
  this live (forcing an invalid token) was inconclusive and was
  abandoned rather than chased further; this rests on code review,
  not on executed evidence.

Fix ideas, not yet applied: add a second E2E case for `/movie/abc`
(cheap); for RF-10, intercept the TMDB request with MSW inside a
Playwright test instead of mangling the token, to verify the full
`page.tsx` → `ErrorState` wiring end to end.
