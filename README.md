# movie-explorer

A [Next.js](https://nextjs.org) (App Router) app that consumes the
[TMDB](https://www.themoviedb.org) API: browse popular movies, filter by
genre, year and sort order, search by title, scroll infinitely and open a
detail page. Built as a portfolio project.

**Stack:** Next.js 16, React 19, TypeScript (strict), Tailwind CSS v4,
TanStack Query, Zod, Vitest, Testing Library, MSW, Playwright.

## How this project is built

This project is built with **spec-driven development**, using
[Claude Code](https://claude.com/claude-code) as an AI pair programmer. The
division of work is explicit and documented in the repo:

- **Spec before code.** Every feature has `spec.md` (EARS requirements),
  `plan.md` and `tasks.md` under [`specs/`](./specs), and none of them is
  implemented until the author has approved them:
  [popular movies](./specs/popular-movies),
  [movie detail](./specs/movie-detail),
  [explore filters](./specs/explore-filters).
- **One task at a time, tests first.** For each task the agent writes a
  failing test, implements until it passes, runs the full suite, marks the
  task done in `tasks.md` and stops for review. A test is never edited to
  make it pass.
- **Rules the agent must follow** live in version control:
  [`AGENTS.md`](./AGENTS.md) (imported by `CLAUDE.md`),
  [`docs/constitution.md`](./docs/constitution.md) and
  [`docs/design.md`](./docs/design.md). If a rule or the spec doesn't fit a
  real need, the agent stops and asks instead of working around it.
- **Decisions are recorded.** Architecture choices and the alternatives
  that were rejected are listed in each `plan.md`. Changes made during
  implementation went back into the spec first, for example RF-23 and the
  `/api/explore` proxy route in `explore-filters`.
- **Attribution.** Commits written with Claude carry a `Co-Authored-By`
  trailer, which is why Claude shows up as a co-author on GitHub.

### Commands

```bash
pnpm dev            # local server
pnpm test           # unit and integration tests (Vitest)
pnpm test:e2e       # Playwright, against the live TMDB API
pnpm lint
pnpm tsc --noEmit   # type check
```

Copy `.env.example` to `.env.local` and set `TMDB_ACCESS_TOKEN` (a TMDB v4
read access token). It is only read on the server and never reaches the
browser.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
