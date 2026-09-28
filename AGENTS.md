# AGENTS.md

This file gives context to Claude when working on this repository.
Update it whenever the stack or constitution changes.

## Project
`movie-explorer` — a Next.js (App Router) app consuming the TMDB API,
built as a portfolio project following Spec-Driven Development (SDD).
Goal: demonstrate mid-senior/senior frontend practices for job applications.

## Always-loaded context
@docs/constitution.md
@docs/design.md

Do not duplicate rules from these files here.

## Commands
- `pnpm dev` — local server
- `pnpm test` — unit/integration tests (Vitest)
- `pnpm test:e2e` — Playwright
- `pnpm lint` · `pnpm typecheck`

## Stack
- Current: Next.js 16 (App Router), React 19, TypeScript, TailwindCSS v4,
  TanStack Query, Zustand, Zod, Vitest, Testing Library, MSW, Playwright.
- Explicitly rejected (do not re-suggest without new justification):
  Supabase, React Router, Framer Motion, custom backend.

## Folder structure
- `app/` — routes, layouts, Server Components.
- `services/` — external API calls, pure and typed. Zod schemas live here.
- `hooks/` — TanStack Query hooks (client-side data).
- `stores/` — Zustand stores (client UI state only).
- `components/` — presentation-only, no data fetching.
- `mocks/` — MSW handlers.
- `e2e/` — Playwright tests.
- `specs/<feature>/` — `spec.md`, `plan.md`, `tasks.md`.
- Unit tests live next to their file as `*.test.ts(x)`.


## Naming
- Components: PascalCase (`MovieCard.tsx`).
- Hooks: camelCase (`useMovies.ts`).
- Everything else: kebab-case (`tmdb-service.ts`).

## Workflow
1. Spec: write `specs/<feature>/spec.md` from `specs/TEMPLATE.md`
   (EARS requirements). Wait for approval.
2. Plan: write `plan.md`. Wait for approval.
3. Tasks: write `tasks.md` with checkboxes. Wait for approval.
4. Implement ONE task at a time in `feat/<name>`:
   failing test first, then code, then run the suite. Mark the task
   done and stop.
5. Open PR referencing the spec. No merge without passing tests.

No code outside an approved task.

## Hard rules
- Never modify or delete a test to make it pass. If a test seems wrong, ask.
- Only use tokens from `design.md`. No hardcoded colors or sizes.
- `TMDB_ACCESS_TOKEN` (read access token, v4, sent as `Authorization:
  Bearer`) lives in `.env.local`, is used server-side only, and is
  never committed.
- If a constitution rule blocks a real need, stop and ask.
  Do not silently violate or work around it.

## Conventions
- Conventional commits with scope: `feat(detail): add cast section`,
  `test(tmdb-service): validate response shape`.

