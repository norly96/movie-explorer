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
  up to 12 of them — the first 12 by TMDB's billing order (`order`
  field) — each with photo, name and character.
- RF-3: WHEN the movie has one or more credited directors, THE
  SYSTEM displays all of their names (e.g. "A & B" when co-directed).
- RF-4: WHEN the movie has at least one video with `type: "Trailer"`
  hosted on YouTube, THE SYSTEM embeds it inline — the one marked
  official if any, otherwise the first available. IF no such trailer
  exists in the requested language (`en-US`), THE SYSTEM retries the
  lookup without the language filter before concluding none exists.
- RF-5: WHEN the movie has backdrop images beyond the one shown in
  the hero, THE SYSTEM renders up to 12 of them in a gallery (posters
  are not repeated here — the hero already shows the main poster).
- RF-6: WHEN any single piece — poster, backdrop, a cast member's
  photo, trailer, gallery images, tagline, runtime, overview, or
  homepage link — is missing or empty for a given movie, THE SYSTEM
  omits that specific piece without showing a broken image, an empty
  label, or breaking the layout. This includes having zero credited
  cast members or zero credited directors, in which case the whole
  Cast or Director section is omitted.
- RF-7: WHEN the visitor clicks a `MovieCard` on the home page, THE
  SYSTEM navigates to `/movie/{id}` for that movie. This extends
  `MovieCard` (built in Spec 1) into a link; its existing rendering
  behavior (Spec 1's RF-2/RF-3) must not regress.
- RF-8: THE SYSTEM renders `/movie/{id}` identically on a direct
  visit, with no prior navigation from the list required.
- RF-9: IF the requested movie id does not exist in TMDB, or is not
  a syntactically valid id, THEN THE SYSTEM shows a dedicated "Movie
  not found" page instead of the detail layout.
- RF-10: IF the TMDB request fails for a reason other than the movie
  not existing (network error, HTTP error, or invalid response
  shape), THEN THE SYSTEM shows an error message with an action that
  reloads the same movie page, and does not crash.
- RF-11: WHILE the movie's data is loading, THE SYSTEM shows a
  loading state — a skeleton matching this page's own layout, not
  Spec 1's grid skeleton — instead of an empty page.
- RF-12: THE SYSTEM provides descriptive alt text for the movie's
  poster, backdrop, and every cast member's photo.
- RF-13: THE SYSTEM makes the trailer embed reachable and operable
  via keyboard.

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
- **Error** (RF-10): TMDB request failed (not a 404 for a
  non-existent id — that's "not found" above) → inline error message
  with an action that reloads this same page, page doesn't crash.
- **Success** (RF-1 to RF-5): full detail rendered, gracefully
  degraded per RF-6 for whatever's missing.

## Out of scope
- Reviews, Recommendations, Similar, Keywords, Release Dates, Watch
  Providers, Collections/sagas → Spec 3 (Extras).
- Full WCAG 2.1 AA verification — still deferred project-wide, same
  as Spec 1. This spec adds only the two minimal requirements above
  (RF-12, RF-13), not a full audit.
- Any user interaction: favoriting, rating, commenting — nothing like
  that exists in the project yet.
- Budget/revenue, full crew list, IMDb link, and the `adult` flag
  (TMDB's adult-content marker — the project has no filtering or
  warning mechanism for it) — explicitly cut from this spec.
- Pagination or infinite scroll of cast/gallery — lists are simply
  capped (RF-2), no "load more."
- Search, filters — unrelated to this spec.

## Definition of done
- RF-1 through RF-13 each have a passing automated test.
- Manual demo: a real movie's page shows every core section; an
  invalid id shows "Movie not found"; simulating a TMDB failure shows
  the error state with a working retry.
