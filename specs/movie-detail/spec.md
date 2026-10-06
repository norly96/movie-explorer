# Movie detail page (core)

## Context and goal
Today `MovieCard` doesn't link anywhere — it's the most visible gap in
the app. This spec adds a per-movie detail page (`/movie/{id}`) with
the essentials: info, cast, trailer and a gallery. Enrichment sections
(reviews, recommendations, similar, keywords, watch providers,
collections) are deferred to Spec 3 (Extras).

## Users / actors
Visitor (unauthenticated) — same actor as Spec 1.

## User stories
- H1: As a visitor, I want to click a movie from the list and see its
  full information, so I can decide whether I want to watch it.
- H2: As a visitor, I want to share or bookmark a direct link to a
  movie, so I can come back to it or send it to someone.

## Functional requirements (EARS)
- RF-1: WHEN the visitor opens `/movie/{id}` for an existing movie,
  THE SYSTEM renders its poster, backdrop, title, tagline, release
  year, runtime, genres, rating, overview, status, original language
  and official homepage link (when TMDB provides it).
- RF-2: WHEN the movie has credited cast members, THE SYSTEM renders
  up to 12 of them, each with photo, name and character.
- RF-3: WHEN the movie has a credited director, THE SYSTEM displays
  their name.
- RF-4: WHEN the movie has at least one trailer, THE SYSTEM embeds
  the official one if marked official, otherwise the first available
  trailer, playable inline.
- RF-5: WHEN the movie has additional images beyond the main
  poster/backdrop, THE SYSTEM renders them in a gallery.
- RF-6: WHEN any single piece (poster, backdrop, a cast member's
  photo, trailer, gallery images) is missing for a given movie, THE
  SYSTEM omits that specific piece without showing a broken image or
  breaking the layout.
- RF-7: WHEN the visitor clicks a `MovieCard` on the home page, THE
  SYSTEM navigates to `/movie/{id}` for that movie.
- RF-8: THE SYSTEM renders `/movie/{id}` identically on a direct
  visit, with no prior navigation from the list required.
- RF-9: IF the requested movie id does not exist in TMDB, THEN THE
  SYSTEM shows a dedicated "Movie not found" page instead of the
  detail layout.
- RF-10: IF the TMDB request fails or its response doesn't match the
  expected schema for an otherwise valid id, THEN THE SYSTEM shows an
  error message with a retry action and does not crash.
- RF-11: WHILE the movie's data is loading, THE SYSTEM shows a
  loading state instead of an empty page.

## Non-functional requirements
- **Efficiency**: one TMDB request per visit, using
  `append_to_response=credits,videos,images` — not four separate
  calls.
- **Security**: reuses the existing server-only `TMDB_ACCESS_TOKEN`
  guard; no new secret handling.
- **Language**: `language=en-US`, same as Spec 1.
- **Separation of concerns**: presentation components stay
  presentation-only; the TMDB call lives in a server-only service
  (constitution §3).
- **Caching**: a movie's details change far less often than a
  "popular" list — longer revalidation window than Spec 1's hourly
  one (exact value decided in the plan).

## UI states
This page has no literal "empty" state (it's a single resource, not a
list) — the equivalent is RF-9's "not found":
- **Loading** (RF-11): skeleton instead of a blank page.
- **"Empty" ≈ Not found** (RF-9): invalid/non-existent id → dedicated
  page, not a generic 404.
- **Error** (RF-10): TMDB request failed → inline error message +
  retry, page doesn't crash.
- **Success** (RF-1 to RF-5): full detail rendered, gracefully
  degraded per RF-6 for whatever's missing.

## Out of scope
- Reviews, Recommendations, Similar, Keywords, Release Dates, Watch
  Providers, Collections/sagas → Spec 3 (Extras).
- Accessibility (WCAG 2.1 AA) dedicated verification — deferred
  project-wide, same as Spec 1.
- Any user interaction: favoriting, rating, commenting — nothing like
  that exists in the project yet.
- Budget/revenue, full crew list, IMDb link — explicitly cut from
  this spec.
- Pagination or infinite scroll of cast/gallery — lists are simply
  capped (RF-2), no "load more."
- Search, filters — unrelated to this spec.

## Definition of done
- RF-1 through RF-11 each have a passing automated test.
- Manual demo: a real movie's page shows every core section; an
  invalid id shows "Movie not found"; simulating a TMDB failure shows
  the error state with a working retry.
