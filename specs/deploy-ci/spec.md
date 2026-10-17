# Deployment and continuous integration

## Context and goal
Three features are merged (popular movies, movie detail, explore filters),
but nothing runs automatically when a change is proposed, and the app has
only ever run on the author's machine. The constitution says "no failing
tests, no merge" (§5), yet today that rule is kept by discipline alone, and
the TMDB proxy and its access token have never been exercised in a real
environment. Larger specs are coming (home redesign, favorites, further
improvements), each of which will open pull requests that can break
something unnoticed.

This spec puts a safety net in place **before** those specs: every pull
request is checked automatically and cannot be merged while a check fails;
`main` is deployed to a real environment; and each production deployment is
verified to actually work. The primary goal is the safety net; the secondary
goal is proving the app in a real environment. The hosting platform is
Vercel. The app itself does not change: visitors will see the same app as
today, now served from a public address that is deliberately not announced.

## Users / actors
- **Maintainer** (the repository owner): opens and merges pull requests and
  needs to know, before merging, that nothing is broken.
- **AI agent** (Claude Code, working in this repository): opens pull
  requests from feature branches and needs the same automatic feedback.
- **Visitors**: anyone who opens the deployed URL. In this iteration the URL
  exists but is **not announced** (not linked anywhere), so in practice
  nobody is invited yet.

## User stories
- H1: As the maintainer, I want every pull request checked automatically for
  lint, types, unit tests and build, so that I cannot merge something broken
  without noticing.
- H2: As the maintainer, I want merging blocked while any check fails, so
  that "no failing tests, no merge" is enforced and not just remembered.
- H3: As the maintainer, I want `main` deployed automatically to a real
  environment, so that the TMDB proxy and token are proven outside my
  machine.
- H4: As the maintainer, I want to be told when a deployed version does not
  actually work (for example, a missing environment variable), so that I find
  out before a visitor does.
- H5: As the maintainer, I want a preview of each pull request on its own
  URL, so that I can review changes on real devices before merging.
- H6: As the maintainer, I want written instructions for setting up and
  rolling back the deployment, so that I can recover without remembering the
  details.

## Functional requirements (EARS)
Requirement numbers are stable identifiers: they are grouped by topic, not
by number.

**Checks**
- RF-1: WHEN a pull request targeting `main` is opened or updated, THE SYSTEM
  runs lint, type check, unit tests and a production build, and reports each
  one as a separate status on that pull request. A lint warning counts as a
  failure.
- RF-2: WHEN a new commit is pushed to a pull request while its checks are
  still running, THE SYSTEM cancels the superseded run, so that only the
  results for the latest commit count.
- RF-3: THE SYSTEM declares the Node.js version the project supports in a
  single place in the repository, and uses that version, together with the
  pnpm version the project declares, in the checks and in the deployment, so
  that results match the maintainer's machine.
- RF-4: THE SYSTEM installs exactly the dependencies recorded in the
  lockfile; IF the lockfile is out of sync with the package manifest, THEN
  the checks fail.
- RF-5: THE SYSTEM provides a `typecheck` command that type-checks the whole
  project without emitting build output (an ignored incremental cache file may
  be written), runnable locally and by the checks.
- RF-6: THE SYSTEM runs the checks without needing any secret, so that they
  behave identically for pull requests from forks.
- RF-20: WHEN a commit lands on `main`, whether by merge or by direct push,
  THE SYSTEM runs the same checks on it and reports each status on that
  commit.

**Merge gate**
- RF-7: IF any required check fails on a pull request, THEN THE SYSTEM
  prevents that pull request from being merged into `main`, except through
  the repository owner's explicit bypass, which exists for emergencies (for
  example, when the checks themselves are broken).
- RF-8: THE SYSTEM requires only the status checks to merge, not reviewer
  approvals, because the project has a single maintainer.
- RF-19: THE SYSTEM requires a pull request to be up to date with `main`
  before it can be merged, so that the checks have run on what will actually
  land.
- RF-21: THE SYSTEM prevents force-pushes to, and deletion of, `main`.

**Deployment**
- RF-9: WHEN a commit is merged into `main`, THE SYSTEM deploys it to
  production automatically.
- RF-10: WHEN a pull request is opened or updated, THE SYSTEM publishes a
  preview deployment of its branch and exposes its URL on the pull request.
- RF-11: THE SYSTEM provides the TMDB access token to production and preview
  deployments as a server-side environment variable only; it is never stored
  in the repository nor exposed to the browser.
- RF-12: IF a production build fails, THEN THE SYSTEM keeps serving the
  previously deployed version and reports the failure on the commit.

**Verification after deployment**
- RF-13: WHEN a production deployment completes, THE SYSTEM requests the home
  page and the movie-list API at that deployment's own address and records,
  as a status on the commit, whether the deployment is healthy: it is healthy
  only if both respond with a success status and the movie-list API returns at
  least one movie.
- RF-14: IF either request in RF-13 fails (an unsuccessful response, a network
  error, a timeout, or no movie returned), THEN THE SYSTEM marks the
  verification as failed, visibly on that commit, and, where the platform
  sends failure notifications for that run, the maintainer is notified through
  them; no custom notification mechanism is built.
- RF-15: WHEN the maintainer triggers it manually, optionally giving a
  deployment address, THE SYSTEM runs the verification of RF-13 against that
  address, or against the production address if none is given; that address
  is held as a repository variable, outside the files of the repository.
- RF-16: THE SYSTEM does not roll back a deployment automatically; reverting
  to a previous deployment is a manual action.
- RF-22: WHERE the platform protects deployments behind its own
  authentication, THE SYSTEM presents the platform's bypass credential for
  automation when it runs the verification of RF-13 or RF-15, so that the
  deployment's own address can be reached; the credential is held as a
  repository secret, is used only by the verification, and is never printed in
  logs nor written in the repository. IF the credential is missing or rejected,
  THEN the verification fails as in RF-14; a redirect to a login page is never
  taken for a healthy page.

**Documentation and visibility**
- RF-17: THE SYSTEM documents in the README how to set up the deployment (what
  to connect, which environment variable to provide and for which environments
  — production and preview —, how to enable the merge gate) and how to roll
  back manually to a previous deployment.
- RF-18: THE SYSTEM does not publish the production URL during this iteration:
  neither in any documentation or automation file tracked in the repository
  (README, docs, specs, workflow definitions) nor in the repository's
  description or website field.

## Non-functional requirements
- **Minimal stack** (constitution §1): no dependency is added to the
  project; the checks and the deployment use only what the platforms provide.
- **Security**: checks run with the least privileges the platform allows
  (read-only access to repository contents); automation steps from outside the
  repository are limited to those published by GitHub itself and are pinned to
  an exact commit identifier; no secret is ever printed in logs. The
  repository is public, so none of this may rely on workflow files or logs
  staying private.
- **No own backend** (constitution §6): the deployment must not introduce
  server code beyond the existing TMDB proxy. The existing guard that fails if
  the token's name appears in client-side source keeps passing.
- **Deterministic checks**: the required checks must not depend on TMDB being
  reachable (the unit tests already use mocked responses). End-to-end tests,
  which use the real TMDB API, are **not** a required check.
- **Stable checks**: the unit tests must pass reliably on the platform's
  runners, which are slower than a developer machine. A required check that
  fails intermittently is treated as a defect to fix, not as something to
  re-run until it turns green.
- **Speed**: a full run of the required checks should finish in under 10
  minutes (target, not a hard limit).
- **Cost**: free tiers only (GitHub Actions for a public repository and
  Vercel's free plan for personal projects).
- **Stable names**: the names of the required checks are stable, because the
  merge gate refers to them by name.
- **Language** (constitution §9): everything in English, including check names
  and documentation.
- **Privacy**: the production URL is public but unannounced; this is **not**
  access control, and password or login protection is out of scope. Preview
  deployments are for the maintainer only: they may require signing in to the
  hosting platform and are not meant to be reachable without it.
- **Tested requirements (constitution §5) — scoped exception**: §5 asks for at
  least one test per functional requirement. Requirements RF-7, RF-9, RF-10,
  RF-12 to RF-16 and RF-19 to RF-21 describe behavior that exists only on the
  hosting platforms and cannot be exercised by the project's test suite. For
  those, the verification is a recorded demonstration (see Definition of
  done) instead of an automated test; where their decision logic lives in
  repository code, that logic is tested automatically and only the platform
  wiring is demonstrated. This is a deliberate exception, limited to this
  spec: every other requirement has an automated test. The demonstration is
  repeated whenever a later spec changes the checks' or the deployment's
  definition.

## UI states
This feature has no end-user interface. The states below are what the
maintainer sees on a pull request or commit.
- **Loading**: checks and the preview deployment show as "pending/in
  progress"; the merge is not yet possible.
- **Success**: all required checks are green and the merge is allowed; after
  merging, the deployment and its verification show as healthy.
- **Error**: a check is red and the merge is blocked; or a production build
  failed (the previous version stays live); or the post-deployment
  verification failed (the new version is live but not working).
- **Empty / not applicable**: with no pull request open, nothing runs.
- **Cancelled**: a superseded run is shown as cancelled, not as a failure.

## Edge cases
- Several commits pushed in quick succession to one pull request: only the
  latest run counts (RF-2).
- A pull request that changes only documentation, specs or notes still runs
  all checks, and its merge still deploys (no exceptions, to keep the gate
  simple).
- The lockfile does not match the manifest: the checks fail instead of
  silently installing something different (RF-4).
- A pull request that was green but is behind `main`: it cannot be merged
  until it is updated, and its checks run again (RF-19).
- A test that fails intermittently on the platform's runners: it is treated as
  a defect and fixed, with the maintainer's approval, because existing tests
  are never edited otherwise; the check is not simply re-run until it is green.
- The access token is missing or invalid in production: the build still
  passes because the token is read when a request arrives, not at build time;
  the post-deployment verification is what detects it (RF-13, RF-14). Making
  the build fail without the token is deliberately not done: it would break
  the checks, which must run without secrets (RF-6). The same happens if the
  variable is provided for production but not for previews (or the other way
  round): the affected environment shows the configuration error.
- TMDB is temporarily unavailable during the verification: the verification
  can report a failure although the deployment is fine; the maintainer can
  repeat it (RF-15). The home page can still respond successfully when TMDB is
  unreachable, because it degrades gracefully; that is why the movie-list API
  is what proves access to TMDB.
- A pull request from a fork: the checks run without secrets (RF-6) and the
  preview deployment is not provided to forks; this project does not support
  external contributions in this iteration.
- Two merges close together: deployments happen in order and the latest
  commit wins; each verification targets its own deployment's address
  (RF-13).
- The repository owner bypasses the merge gate (RF-7) or pushes directly to
  `main`: the deployment still happens, the checks of RF-20 and the
  verification of RF-13 still run and report on that commit, and the bypass is
  visible in the platform's records. This is accepted, for emergencies only.
- A pull request that edits the checks' own definition: the checks run with
  the version of the definition in that pull request, so it can change or
  weaken them. Such a change is visible in the diff and the maintainer reviews
  it like any other; no automatic safeguard is added.
- The preview deployments use the same TMDB token as production, so they
  share its rate limit.
- A hosting-platform outage: the maintainer sees the platform's failure on the
  commit; nothing in this spec works around it.

## Out of scope
- End-to-end tests in the checks (they run locally or on demand).
- Lighthouse in the checks and performance budgets (a later audit spec).
- Cache headers on the movie-list API, to protect the TMDB quota (candidate
  for the performance/audit spec).
- Cleanup of unused code and tests (`resolve-view-state`, a missing debounce
  test): these go first in the home redesign spec.
- Custom domain, analytics and error monitoring.
- Custom notification mechanisms (email or issue bots).
- Automatic rollback.
- Password or login protection for the deployed URL.
- Dependency update bots and security scanning.
- Anything visible to visitors: the redesign, the TMDB attribution page and
  favorites are separate specs. Until the attribution exists, the URL stays
  unannounced.

## Definition of done
- Every RF has at least one verification (see the scoped exception under
  Non-functional requirements). Where the requirement lives in the
  repository (the checks' definition, the declared Node.js version, the
  `typecheck` command, the README guide, the absence of the production URL from
  documentation files and workflow definitions), a passing automated test that
  reads the configuration files as text and asserts the essentials (commands
  present, check names, read-only permissions, pinned steps, no address on the
  platform's default domain in the documentation and the workflow definitions);
  the real run is the proof of the behavior. Where it depends on the platforms
  (RF-7, RF-9, RF-10, RF-12 to RF-16, RF-19 to RF-21), a recorded
  demonstration, listed in the pull request description (which may be edited
  after the merge, because the demonstrations need the workflows already
  merged):
  1. A pull request with a deliberately failing test shows a red status and
     cannot be merged; a pull request with everything green can.
  2. A green pull request that is behind `main` cannot be merged until it is
     updated; a force-push to `main` is rejected.
  3. Merging a green pull request triggers a production deployment, the same
     checks run on the resulting commit, and a preview URL appears on pull
     requests.
  4. The post-deployment verification is green on a healthy deployment and
     red when run manually against a preview deployment that has no access
     token (never against production).
  5. The repository's description and website field contain no deployment
     address (checked by hand).
  6. A pull request with a deliberately broken build shows a failed preview
     deployment on that pull request while production keeps serving the
     previous version. This is evidence of the same platform behavior RF-12
     describes, obtained on a preview; it is not a broken production build,
     which the merge gate exists to prevent.
- The checks pass on five consecutive runs of the same commit on the
  platform, started on purpose to measure stability, all green on the first
  attempt.
- `pnpm typecheck` works locally and the existing test suite still passes.
- No dependency was added to the project.
- The README guide is present and the production URL is not published.

## Open questions
None at this time. How the deployment and the verification are wired
together, where the Node.js version is declared, the check names, the timeout
values and the exact merge-gate settings are decisions for `plan.md`.
