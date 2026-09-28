# Popular movies list

## Context and goal
Visitors currently have no way to discover movies within the app. This
feature adds a home page that lists currently popular movies from TMDB,
giving the project its first end-to-end vertical slice (service, data
validation, presentation, tests).

## Users / actors
Visitor (unauthenticated).

## User stories
- H1: As a visitor, I want to see popular movies with their poster,
  title, year and rating, so I can discover something to watch.

## Functional requirements (EARS acceptance criteria)
- RF-1: WHEN the visitor opens `/`, THE SYSTEM renders one card per
  movie returned by TMDB `GET /movie/popular` (first page, up to 20).
- RF-2: WHEN a movie has no poster, THE SYSTEM shows a placeholder
  image instead of a broken image.
- RF-3: WHEN a movie has no release date, THE SYSTEM omits the year
  without breaking the card layout.
- RF-4: IF TMDB returns an empty list, THEN THE SYSTEM shows a
  "No movies found" message instead of an empty grid.
- RF-5: IF the request fails or the response does not match the
  expected schema, THEN THE SYSTEM shows an error message and does not
  crash.
- RF-6: WHILE data is loading, THE SYSTEM shows a loading state instead
  of an empty page.
- RF-7: THE SYSTEM never exposes the TMDB read access token to the
  browser.

## Non-functional requirements
- **Security**: TMDB read access token stored server-side only
  (`TMDB_ACCESS_TOKEN` env var), sent as `Authorization: Bearer`.
- **Language**: all content requested from TMDB uses `language=en-US`;
  code, commits and this spec are written in English (constitution
  rule 6).
- **Separation of concerns**: `MovieCard`/`MovieGrid` are presentation
  only; all TMDB calls live in `services/tmdb-service.ts`
  (constitution rule 3).

## Edge cases
- Movie with missing poster (RF-2).
- Movie with missing release date (RF-3).
- Empty result list (RF-4).
- TMDB request failure (network error, 4xx/5xx) (RF-5).
- TMDB response with an unexpected shape (validation failure) (RF-5).

## Out of scope
- Pagination or infinite scroll (spec 002).
- Search, filters, movie detail page, favorites.
- UI/visual design (layout, breakpoints, loading/rating presentation):
  defined separately, not part of this spec.
- Accessibility (WCAG 2.1 AA, keyboard navigation, semantic HTML):
  constitution §7 applies to the project as a whole, but this spec
  does not add a dedicated RF or test for it. Deferred to a later
  spec/PR that verifies it explicitly.

## Definition of done
- RF-1 through RF-7 each have a passing automated test (Vitest + MSW
  for the service, Testing Library for the components).
- Manual demo: loading the home page shows the grid, a poster
  placeholder renders correctly for at least one movie, and the error
  state can be triggered by simulating a failed request.

## Open questions
None at this time.
