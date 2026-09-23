# AGENTS.md

This file gives context to Claude when working on this repository.
Update it whenever the stack or constitution changes.

## Project
`movie-explorer` — a Next.js (App Router) app consuming the TMDB API,
built as a portfolio project following Spec-Driven Development (SDD).
Goal: demonstrate mid-senior/senior frontend practices for job applications.

## Rules
All non-negotiable rules live in `docs/constitution.md` — read it before
any architectural decision. Do not duplicate rules here.

## Stack
- Current: Next.js 16 (App Router), React 19, TypeScript, TailwindCSS v4,
  TanStack Query, Zustand, Zod, Vitest, Testing Library, MSW, Playwright.
- Explicitly rejected (do not re-suggest without new justification):
  Supabase, React Router, Framer Motion, custom backend.

## Folder structure
- `app/` — routes, layouts, Server Components.
- `services/` — all external API calls, pure and typed.
- `components/` — presentation-only, no data fetching.
- `specs/` — one markdown file per feature, written before code.

## Naming
- Components: PascalCase (`MovieCard.tsx`).
- Everything else: kebab-case (`tmdb-service.ts`).

## Workflow
1. Write/confirm the spec in `/specs/<feature>.md`.
2. Wait for explicit approval before writing any code or creating files.
3. Implement in a feature branch (`feat/<name>`).
4. Add the test(s) validating the spec, in the same PR.
5. Open PR referencing the spec file. No merge without a passing test.

## Conventions
- Conventional commits with scope: `feat(detail): add cast section`,
  `test(tmdb-service): validate response shape`.

## Breaking a rule
If a rule in the constitution genuinely blocks a real need, stop and
ask — do not silently violate it or work around it.
