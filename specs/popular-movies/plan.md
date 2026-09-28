# Plan — Popular movies list

## Modules

| Module | File | Responsibility |
|---|---|---|
| Env config | `services/tmdb-config.ts` | Reads and validates `TMDB_ACCESS_TOKEN` at load time. Guarded with the `server-only` package so any accidental import from client code fails the build. |
| Raw schema + mapper | `services/schemas/movie-schema.ts` | Zod schemas for TMDB's raw response; maps raw shape → domain `Movie`. |
| TMDB client | `services/tmdb-service.ts` | `getPopularMovies()`. The only place that calls `fetch` against TMDB. Never throws for expected failures — returns a `ServiceResult`. |
| View-state resolver | `app/resolve-view-state.ts` | Pure function, no JSX: turns a `ServiceResult<Movie[]>` into `empty \| error \| grid`. Exists so the branching logic is unit-testable without rendering an async Server Component. |
| Route | `app/page.tsx` | Server Component. Calls the service, resolves view state, renders `EmptyState`, `ErrorState`, or `MovieGrid`. |
| Loading UI | `app/loading.tsx` | Next.js file convention; auto-wraps `page.tsx` in Suspense. Renders a grid of `MovieCardSkeleton`. |
| Error boundary | `app/error.tsx` | Safety net for *unexpected* exceptions (bugs), distinct from the handled TMDB failure path. |
| Grid | `components/MovieGrid.tsx` | Presentation only: `movies: Movie[]` → list of `MovieCard`. |
| Card | `components/MovieCard.tsx` | Poster (or placeholder), title, year, `RatingBadge`. |
| Rating | `components/RatingBadge.tsx` | Renders `rating` or "No rating". |
| Skeleton | `components/MovieCardSkeleton.tsx` | Same footprint as `MovieCard`, no data. |
| Empty state | `components/EmptyState.tsx` | Per `design.md`. |
| Error state | `components/ErrorState.tsx` | Per `design.md`. |
| Image config | `next.config.ts` | `images.remotePatterns` allowing `image.tmdb.org`. |
| Env template | `.env.example` | Documents `TMDB_ACCESS_TOKEN` without the real value. |

## Component tree

```
app/page.tsx (Server Component)
├─ (loading)  app/loading.tsx
│   └─ MovieCardSkeleton × N
├─ (error)    app/error.tsx            — unexpected exceptions only
└─ (resolved, via resolveViewState)
    ├─ "empty" → EmptyState
    ├─ "error" → ErrorState             — handled TMDB failures
    └─ "grid"  → MovieGrid
                  └─ MovieCard × N
                      └─ RatingBadge
```

## State and routes

- **Routes**: single route, `/` (`app/page.tsx`). No dynamic segments.
- **State**: none. No Zustand, no TanStack Query. The whole feature is server-rendered per request; there is no client interactivity in scope (constitution §3: "Server-side is the default").
- **Caching**: `fetch(..., { next: { revalidate: 3600 } })` in `tmdb-service.ts` — page regenerates at most hourly.

## Data model (types only)

```ts
// --- Raw TMDB shape, internal to services/ ---
interface TmdbMovieRaw {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;       // "" when TMDB doesn't know it
  vote_average: number;
  vote_count: number;
}

interface TmdbPopularResponseRaw {
  page: number;
  results: TmdbMovieRaw[];
  total_pages: number;
  total_results: number;
}

// --- Domain shape, exported to components ---
interface Movie {
  id: number;
  title: string;
  posterUrl: string | null;    // null → RF-2 placeholder
  releaseYear: number | null;  // null → RF-3 omit year
  rating: number | null;       // null → "unrated" (vote_count === 0)
}

// --- Service boundary ---
type TmdbServiceErrorReason = "network" | "http" | "invalid_response";

interface TmdbServiceError {
  reason: TmdbServiceErrorReason;
  status?: number; // present when reason === "http"
}

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: TmdbServiceError };

// --- View state (app/resolve-view-state.ts) ---
type ViewState =
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "grid"; movies: Movie[] };
```

### Module signatures (no bodies)

```ts
// services/tmdb-config.ts
function getTmdbConfig(): { accessToken: string; baseUrl: string; imageBaseUrl: string };

// services/schemas/movie-schema.ts
const TmdbMovieRawSchema: ZodType<TmdbMovieRaw>;
const TmdbPopularResponseRawSchema: ZodType<TmdbPopularResponseRaw>;
function toMovie(raw: TmdbMovieRaw, imageBaseUrl: string): Movie;

// services/tmdb-service.ts
function getPopularMovies(): Promise<ServiceResult<Movie[]>>;

// app/resolve-view-state.ts
function resolveViewState(result: ServiceResult<Movie[]>): ViewState;
```

```ts
// components/MovieGrid.tsx
interface MovieGridProps { movies: Movie[] }        // always non-empty when rendered

// components/MovieCard.tsx
interface MovieCardProps { movie: Movie }

// components/RatingBadge.tsx
interface RatingBadgeProps { rating: number | null }

// components/EmptyState.tsx
interface EmptyStateProps { message?: string }       // default: "No movies found"

// components/ErrorState.tsx
interface ErrorStateProps { message?: string }
```

## Decisions (with the rejected alternative)

| # | Decision | Rejected alternative | Why |
|---|---|---|---|
| 1 | Service returns `ServiceResult<T>` (discriminated union) instead of throwing | Throw + rely on `error.tsx` | RF-5 wants an inline error message on the same page, not a full route-level error replacing everything. Exceptions would conflate "TMDB is down" with "there's a bug in our code." |
| 2 | Map TMDB's raw shape into a domain `Movie` type | Pass TMDB's raw fields straight to components | Decouples the UI from TMDB's naming (`poster_path`, `vote_average`) and its future changes; keeps components presentation-only (constitution §3). |
| 3 | `rating: number \| null`, using `vote_count === 0` to decide "unrated" | Treat `vote_average === 0` as unrated | A movie can legitimately have a real `0.0` from a handful of votes; conflating that with "no rating" would misrepresent it. |
| 4 | `app/loading.tsx` (Next.js file convention) for the loading state | Client component with `useState`/`useEffect` | Zero client JS for something with no interactivity; the page is already an async Server Component, so Next's built-in Suspense boundary is the idiomatic fit (constitution §8, performance). |
| 5 | `next: { revalidate: 3600 }` | `cache: "no-store"` (fetch every request) or default `force-cache` (fetch once, never again) | Balances freshness against TMDB rate limits; `no-store` wastes quota on identical requests, `force-cache` would go stale until redeploy. |
| 6 | Extract `resolveViewState()` as a pure function | Put the empty/error/grid branching inline in `page.tsx` | Async Server Components can't be rendered with Testing Library today; pulling the branching logic out makes it unit-testable in isolation (see Risks). |
| 7 | Guard `tmdb-config.ts` with the `server-only` package | Rely on convention (just "don't import it from a client component") | RF-7 and constitution §7 (hide the API key) are non-negotiable; `server-only` turns an accidental client import into a build failure instead of a runtime leak. New dependency, not yet in the declared stack — approved by the user for this feature. |
| 8 | Add `.env.example` documenting `TMDB_ACCESS_TOKEN` | Document it only in prose (README/spec) | Standard onboarding practice; keeps the required var discoverable without duplicating docs. |

## Risks

- **TMDB rate limiting / downtime** during revalidation → surfaces as RF-5's error state; acceptable, but repeated failures across many concurrent requests aren't debounced in this plan.
- **Zod schema too strict** → if written with `.strict()`, any new field TMDB adds later breaks parsing. Mitigation: schema only picks the fields we use, no `.strict()`.
- **RSC testing limits**: `app/page.tsx` itself (an async Server Component) can't be rendered with Vitest + Testing Library today. Mitigated by decision #6, but the actual wiring in `page.tsx` (calling the service, calling `resolveViewState`, picking the component) is only verified by the Playwright E2E test and the manual demo — not by a unit test of `page.tsx` itself.
- **Missing/invalid env var in production** → mitigated by validating eagerly in `tmdb-config.ts` (fail fast with a clear message instead of a cryptic 401 from TMDB).
- **`next.config.ts` misconfigured** (`remotePatterns` wrong) → posters silently broken only in deployed environments if not caught locally; needs an explicit check before opening the PR.

## Test strategy

| Test file | Covers |
|---|---|
| `services/schemas/movie-schema.test.ts` | RF-2, RF-3 (missing poster / missing date → `null`), rating/unrated mapping |
| `services/tmdb-service.test.ts` (Vitest + MSW) | RF-1 (valid payload → `Movie[]`), RF-5 (network error, HTTP error, invalid shape → each `ServiceErrorReason`) |
| `app/resolve-view-state.test.ts` | RF-4 (empty array → `"empty"`), RF-5 (`ok:false` → `"error"`) |
| `components/MovieCard.test.tsx` | RF-2, RF-3 (placeholder / omitted year) |
| `components/MovieGrid.test.tsx` | RF-1 (N movies → N cards) |
| `components/EmptyState.test.tsx` | RF-4 (message rendered) |
| `components/ErrorState.test.tsx` | RF-5 (message rendered) |
| `components/MovieCardSkeleton.test.tsx` | RF-6 (correct shape/count when rendered standalone) |
| `services/no-secret-leak.test.ts` (static check) | RF-7 — greps `app/`, `components/`, `hooks/`, `stores/` for the string `TMDB_ACCESS_TOKEN` and fails if found outside `services/` |
| `e2e/popular-movies.spec.ts` (Playwright) | RF-1 end-to-end happy path; RF-6 (skeleton visibly precedes content — not practically assertable in Vitest due to the RSC/Suspense limit above) |

## RF coverage matrix

| RF | Covered by |
|---|---|
| RF-1 | `tmdb-service.ts`/`movie-schema.ts` + `MovieGrid`/`MovieCard`; tested in `tmdb-service.test.ts`, `MovieGrid.test.tsx`, E2E |
| RF-2 | `movie-schema.ts` mapping + `MovieCard` placeholder; tested in `movie-schema.test.ts`, `MovieCard.test.tsx` |
| RF-3 | Same as RF-2 |
| RF-4 | `resolve-view-state.ts` + `EmptyState`; tested in `resolve-view-state.test.ts`, `EmptyState.test.tsx` |
| RF-5 | `tmdb-service.ts` + `resolve-view-state.ts` + `ErrorState` + `app/error.tsx`; tested in `tmdb-service.test.ts`, `resolve-view-state.test.ts`, `ErrorState.test.tsx` |
| RF-6 | `app/loading.tsx` + `MovieCardSkeleton`; tested in `MovieCardSkeleton.test.tsx` (shape) and E2E (timing) |
| RF-7 | `tmdb-config.ts` (`server-only` guard); tested in `no-secret-leak.test.ts` |

## RF not covered

None — RF-1 through RF-7 all have at least one automated test, satisfying constitution §5. Two are worth flagging as not fully unit-tested, per the risks above:
- **RF-6**: the actual loading→content transition is only verified by Playwright, not Vitest (RSC/Suspense can't be rendered with Testing Library yet).
- **RF-7**: verified by a static grep test, not a behavioral one — it proves the token string doesn't appear in client-reachable files, not that a build would fail (that guarantee comes from `server-only` itself, at build time).
