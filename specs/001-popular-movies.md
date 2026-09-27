# Spec 001: Popular movies list

**Status:** Approved · **Branch:** `feat/popular-movies`

## Goal
Show the user a grid of currently popular movies on the home page, fetched from TMDB.

## User story
As a visitor, I want to see popular movies with their poster, title, year and rating, so I can discover something to watch.

## In scope
- Home page (`/`) renders a responsive grid of movie cards.
- Each card shows poster, title, release year and rating (one decimal).
- Data comes from TMDB `GET /movie/popular`, first page only, `language=en-US`.
- Loading, empty and error states.

## Out of scope
- Pagination or infinite scroll (spec 002).
- Search, filters, movie detail page, favorites.

## Acceptance criteria
1. Visiting `/` renders one card per movie returned by the API (up to 20).
2. A movie without a poster shows a placeholder instead of a broken image.
3. A movie without a release date shows no year, and the layout does not break.
4. If the API returns an empty list, a "No movies found" message is shown.
5. If the request fails or the response does not match the schema, an error message is shown and the app does not crash.
6. The TMDB read access token is never exposed to the browser.

## Architecture
- `services/tmdb-service.ts`: `getPopularMovies()`, the only place that calls TMDB. Sends `Authorization: Bearer ${TMDB_ACCESS_TOKEN}`.
- `services/schemas/movie-schema.ts`: Zod schema; the service parses the response and returns a typed `Movie[]`.
- `components/MovieCard.tsx` and `components/MovieGrid.tsx`: presentation only, they receive data via props.
- `app/page.tsx`: Server Component that calls the service and renders the grid.
- Config: `TMDB_ACCESS_TOKEN` env var (server-only, read access token v4), and `image.tmdb.org` allowed in `next.config.ts`.

## Tests
- **Service** (Vitest + MSW): valid response is parsed; invalid shape is rejected; HTTP error is handled.
- **Components** (Testing Library): `MovieCard` covers criteria 2 and 3; `MovieGrid` covers criterion 4.

## Dependencies introduced
Each one solves a problem in this spec: `zod` (validate the API response), `vitest`, `jsdom` and `@vitejs/plugin-react` (test runner), `@testing-library/*` (component tests) and `msw` (mock TMDB).
