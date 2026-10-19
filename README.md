# movie-explorer

A [Next.js](https://nextjs.org) (App Router) app that consumes the
[TMDB](https://www.themoviedb.org) API: browse popular movies, filter by
genre, year and sort order, search by title, scroll infinitely and open a
detail page. Built as a portfolio project.

**Stack:** Next.js 16, React 19, TypeScript (strict), Tailwind CSS v4,
TanStack Query, Zod, Vitest, Testing Library, MSW, Playwright.

## TMDB attribution

<img src="public/tmdb-logo.svg" alt="TMDB" height="24">

This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.

The movie data and images come from [TMDB](https://www.themoviedb.org). This is a
free portfolio project: TMDB's API terms of use do not allow commercial use
without a separate agreement.

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

## Deployment

Every pull request runs four checks on GitHub Actions (`lint`, `typecheck`,
`test`, `build`, defined in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)).
`main` is deployed to production on Vercel, and every pull request gets a
preview deployment. After each production deployment a second workflow,
[`verify-deployment.yml`](./.github/workflows/verify-deployment.yml),
checks the home page and `/api/explore?page=1` and records the result as the
commit status `deployment-health`. The production address is deliberately not
written anywhere in this repository.

### 1. Connect Vercel

1. In Vercel, import the GitHub repository (Add New → Project). Vercel reads
   the Node.js version from `engines.node` in `package.json`; no build setting
   needs changing.
2. Add the environment variable `TMDB_ACCESS_TOKEN` (a TMDB v4 read access
   token) for **both** the **Production** and the **Preview** environments,
   marked as *sensitive*. A preview without it cannot load any movie.
3. Do this while the first pull request is open, so that it gets its own
   preview and a problem with the token shows up before merging.

The token is only read on the server and never reaches the browser or the
repository. The CI jobs need no secret: `pnpm build` works without it.

### 2. Create the `PRODUCTION_URL` repository variable

The manual verification needs the production address when none is given. It is
not a secret, but it must not be committed, so it lives in a repository
variable:

```bash
gh variable set PRODUCTION_URL --body "<production address>"
```

### 3. Apply the rulesets

Two rulesets live in [`docs/deployment/`](./docs/deployment): `ruleset-main-gate.json`
(the four checks must pass and the branch must be up to date, no review
required, with a bypass for the repository owner) and
`ruleset-main-history.json` (no force-push and no deletion of `main`, no
bypass).

Apply them **after the checks have run on `main` at least once**. A required
check that has never reported blocks every merge.

1. Look up the identifier of the administrator role for the bypass; do not
   guess it. For example, create a throwaway ruleset in Settings → Rules with
   the Admin role as bypass, read it back with
   `gh api repos/<owner>/<repo>/rulesets/<id> --jq .bypass_actors`, then delete
   the throwaway ruleset.
2. Replace `__ADMIN_ROLE_ID__` in `ruleset-main-gate.json` with that number
   (without committing the change), then create both rulesets:

```bash
gh api repos/<owner>/<repo>/rulesets --method POST --input docs/deployment/ruleset-main-gate.json
gh api repos/<owner>/<repo>/rulesets --method POST --input docs/deployment/ruleset-main-history.json
```

Inspect what is applied with `gh api repos/<owner>/<repo>/rulesets`; the JSON
files describe the intended rules and cannot show drift.

### 4. Verify a deployment by hand

The workflow *Verify deployment* can be run from the Actions tab, or with
`gh workflow run`. The address is optional; without it the `PRODUCTION_URL`
variable is used, and with neither the run fails and says what is missing:

```bash
gh workflow run "Verify deployment"                       # production address
gh workflow run "Verify deployment" -f address=<address>  # any deployment
```

To check that a **preview** really fails without the token: remove the
Preview-scoped `TMDB_ACCESS_TOKEN` in Vercel, open a pull request, run the
verification against its preview address (expect `deployment-health` to fail),
then restore the variable and run it again (expect it to pass).

### 5. When something fails

- **Where to look.** A failed verification is a red `deployment-health` status
  on the deployed commit and a failed run in the Actions tab. A notification may
  not arrive, because runs triggered by a deployment event are attributed to
  the integration, so check those two places after merging.
- **A failed production build** leaves the previous deployment serving; the
  failure is reported on the commit.
- **Roll back manually.** Nothing rolls back automatically. In Vercel, open the
  project's Deployments, pick the last good previous deployment and use
  Instant Rollback (or promote it to production). Then fix `main` with a normal
  pull request.
