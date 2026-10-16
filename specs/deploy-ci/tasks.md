# Tasks — Deployment and continuous integration

17 tasks, ordered by dependency. `[P]` = does not depend on any pending task
in its own phase and can be done in parallel with the other `[P]` tasks in
that phase (the workflow still implements one task at a time).
`[manual]` = a step only the maintainer can do (an account, a dashboard); I
guide it. `⚠️ approval` = an action visible outside the repository (push, pull
request, merge, repository settings): it is confirmed at that moment, never
assumed.

Spec: [`spec.md`](./spec.md) · Plan: [`plan.md`](./plan.md).
Every task that adds code or configuration starts with its failing test, as in
the previous specs.

Dependencies at a glance:

| Phase | Tasks | Needs |
|---|---|---|
| 0 Foundation | T01, T02 | — |
| 1 Entry point and workflows | T03, T04, T05, T06 | T03 ← T01, T02 · T04 ← T01 · T05 ← T03 · T06 ← T04 |
| 2 Documentation | T07, T07b | T05, T06 |
| 3 Pull request and platform | T08 → T09 → T10 → T11 | T07, T07b (then each one the previous) |
| 4 Demonstrations and close | T12, T13, T14, T15, T16 | T12 ← T11 · T13 ← T11, T12 · T14 ← T10 · T15 ← T08 · T16 ← T12–T15 |

## Phase 0 — Foundation

- [x] **T01 — package.json: `typecheck`, Node.js version, strict lint**
  - Depends on: —
  - Files: `package.json` (modified), `ci-config.test.ts` (new, root; first block only)
  - RF: RF-1 (a lint warning fails), RF-3 (Node.js declared once), RF-5
  - Done when: a `package.json` block in `ci-config.test.ts` (written first, failing) asserts that `scripts.typecheck` runs the compiler without emitting, that `engines.node` is declared as a major-version range (`24.x`), and that `scripts.lint` fails on any warning; the test passes; `pnpm typecheck` and `pnpm lint` both exit 0 on the current code; the full suite still passes; no dependency added.

- [x] **T02 [P] — Verification library**
  - Depends on: —
  - Files: `scripts/verify-deployment.ts`, `scripts/verify-deployment.test.ts`
  - RF: RF-13, RF-14
  - Done when: MSW-backed tests (written first) cover — both probes healthy → `healthy: true`; `/` answers 5xx; `/api/explore?page=1` answers 5xx; the API returns an empty `movies` array; the API returns a body that is not the expected shape; network error; timeout (per request); a trailing slash in the target; always exactly two probe results in a fixed order. The library matches the types in `plan.md` (`ProbeResult`, `VerificationResult`, `VerifyOptions`), imports nothing outside Node built-ins, and uses only erasable TypeScript syntax. `pnpm typecheck` passes.

## Phase 1 — Entry point and workflows

- [x] **T03 [P] — Verification entry point**
  - Depends on: T01, T02
  - Files: `scripts/verify-deployment-cli.ts`, `scripts/verify-deployment-cli.test.ts`, `tsconfig.json` (modified)
  - RF: RF-14, RF-15 (and RF-3: it runs on the declared Node.js version)
  - Done when: tests (written first) run the script as a **child process** with `node` against a tiny local HTTP server created in the test — healthy server → exit 0 with a readable report; server answering 5xx or no movies → exit 1; no argument → exit 2; unreachable address with `--attempts 1` → exit 1 within a bounded time. The script retries a bounded number of times before declaring a failure (`--attempts`, default 3, and `--delay`), and the library stays single-shot. It runs without a build step on the repository's declared Node.js version. `tsconfig.json` allows importing a `.ts` path (`allowImportingTsExtensions`, compatible with `noEmit`): the red state is `pnpm typecheck` failing on the entry point's import of the library, and it passes afterwards, as does `next build`.

- [x] **T04 [P] — CI workflow**
  - Depends on: T01
  - Files: `.github/workflows/ci.yml`, `ci-config.test.ts` (modified)
  - RF: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-20
  - Done when: a `ci.yml` block in `ci-config.test.ts` (written first) asserts — triggers are pull requests to `main` and pushes to `main`; four jobs named exactly `lint`, `typecheck`, `test`, `build`; `permissions` is read-only on contents; the install uses the frozen lockfile; the Node.js version is read from `package.json`; pnpm is activated through Corepack; concurrency cancels runs for pull requests but **not** for pushes to `main`; **no reference to any secret**; every step from outside the repository comes from GitHub and is pinned to a 40-character commit identifier (looked up from the release with the `gh` CLI at implementation time and recorded with its version in a comment, never typed from memory); each job runs its own command (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`); no `paths` or `paths-ignore` filter, so documentation-only pull requests also run every check; no end-to-end step. The test passes and the full suite still passes.

- [x] **T05 [P] — Verification workflow**
  - Depends on: T03
  - Files: `.github/workflows/verify-deployment.yml`, `ci-config.test.ts` (modified)
  - RF: RF-13, RF-14, RF-15, RF-16, RF-18
  - Done when: a `verify-deployment.yml` block in `ci-config.test.ts` (written first) asserts — triggers are `deployment_status` and `workflow_dispatch` with an optional address input; the automatic path runs only for a successful **Production** deployment and reads the environment name from the event; the target is the event's own deployment address, and for a manual run the given address or, if none, the repository variable `PRODUCTION_URL` (an empty target makes the entry point exit with a usage error); the workflow contains no literal deployment address; the status context is `deployment-health` and is written for the deployed commit's identifier; `statuses: write` appears only on the job that needs it and the rest is read-only; steps from outside the repository follow the same pinning rule as T04; **no step rolls anything back**. The test passes.

- [x] **T06 [P] — Ruleset definitions**
  - Depends on: T04
  - Files: `docs/deployment/ruleset-main-gate.json`, `docs/deployment/ruleset-main-history.json`, `ci-config.test.ts` (modified)
  - RF: RF-7, RF-8, RF-19, RF-21
  - Done when: a rulesets block in `ci-config.test.ts` (written first) asserts — both files are valid JSON matching `RulesetDefinition`; the gate requires exactly the four job names found in `ci.yml` (the test reads both files, so they cannot drift), enables the strict "branch must be up to date" policy, has **no pull-request review rule**, and carries one bypass entry whose role identifier is a documented placeholder (`__ADMIN_ROLE_ID__`) that T11 replaces with the value looked up from the API — never a guessed number; the history ruleset forbids force-push and deletion and has **no bypass entry**. The tests pass.

## Phase 2 — Documentation

- [x] **T07 [P] — README "Deployment" guide**
  - Depends on: T05, T06
  - Files: `README.md` (modified), `ci-config.test.ts` (modified)
  - RF: RF-11, RF-16, RF-17, RF-18
  - Done when: a documentation block in `ci-config.test.ts` (written first) asserts that the README's deployment section — replacing the generic "Deploy on Vercel" boilerplate — names `TMDB_ACCESS_TOKEN` and **both** environments (production and preview), explains how to connect the platform, how to apply the two rulesets (including looking up the administrator role identifier and substituting the placeholder), how to run the verification manually with an optional address and the `PRODUCTION_URL` repository variable (its name and how to create it, never its value), how to verify a preview deployed without the token (remove the Preview-scoped variable, run, restore it), where to look for a failure (the commit status and the Actions tab, because a notification may not arrive), and how to roll back manually; and that no address on the platform's default domain appears in `README.md`, `docs/`, `specs/` or `.github/`. The existing `no-secret-leak` test and the whole suite still pass.

- [ ] **T07b [P] — Update `AGENTS.md`**
  - Depends on: T05, T06
  - Files: `AGENTS.md` (modified)
  - RF: — (housekeeping: `AGENTS.md` asks to be updated whenever the stack changes)
  - Done when: the Stack section lists GitHub Actions (CI) and Vercel (hosting), and the Folder structure section lists `.github/`, `scripts/` and `docs/deployment/` with one line each; no other line of `AGENTS.md` changes; no automated test applies (it documents existing conventions); the full suite still passes.

## Phase 3 — Pull request and platform setup

- [ ] **T08 — Open the pull request** `⚠️ approval`
  - Depends on: T07, T07b
  - Files: — (no repository files)
  - RF: RF-1, RF-2, RF-4, RF-6 (first real run)
  - Done when: the branch is pushed and a pull request that references `specs/deploy-ci/` is open against `main`; the four jobs run **on the pull request itself** and are green; the run used no secret; a second push to the branch cancels the first run's still-running jobs (RF-2 seen once on the platform).

- [ ] **T09 — Connect the hosting platform** `[manual]`
  - Depends on: T08 (so the open pull request gets its own preview)
  - Files: — (platform settings)
  - RF: RF-3 (preview build), RF-9, RF-10, RF-11, RF-12, RF-15 (the repository variable), RF-18
  - Done when: the repository is connected with `main` as the production branch; the **preview build of the open pull request** uses the Node.js version declared in `engines.node` (read in its build log); `TMDB_ACCESS_TOKEN` exists as a sensitive server-side variable for **Production and Preview**; the open pull request shows a preview address and the preview loads the home page and `/api/explore?page=1` with movies; production has a deployment of the current `main`; the repository variable `PRODUCTION_URL` exists (its value is not written in any file of the repository); no "ignored build step" is configured, so documentation-only merges also deploy; and three observations are noted — the platform plan in use is the free one (Cost), opening a preview in a private window asks for the platform's login (Privacy), and the production address appears nowhere in the repository.

- [ ] **T10 — Merge the pull request (no rulesets yet)** `⚠️ approval` `[manual]`
  - Depends on: T09
  - Files: — (no repository files)
  - RF: RF-3 (production build), RF-9, RF-13, RF-20
  - Done when: the maintainer merges; the same four checks run on the merge commit on `main` and report four statuses on it; a production deployment of that commit completes; the verification workflow (now on `main`) runs for it and writes `deployment-health` on that commit, and it is green; the production build of that commit used the Node.js version declared in `engines.node` (read in its build log).

- [ ] **T11 — Apply the rulesets** `⚠️ approval`
  - Depends on: T10 (the checks must have reported at least once, or every merge would be blocked)
  - Files: — (repository settings; the two JSON files are read, not changed)
  - RF: RF-7, RF-8, RF-19, RF-21
  - Done when: the administrator role identifier is **looked up through the API**, substituted for the placeholder, and both rulesets are created with the `gh` CLI exactly as the README describes; listing the repository's rulesets shows both as active, the gate requiring the four checks with the strict policy and the owner bypass, and the history ruleset with no bypass.

## Phase 4 — Demonstrations and close

- [ ] **T12 [P] — Demonstrations 1 and 2: the merge gate** `⚠️ approval`
  - Depends on: T11
  - Files: — (throwaway branches and pull requests)
  - RF: RF-7, RF-8, RF-19, RF-21
  - Done when: (1) a pull request with a deliberately failing test shows a red check and **cannot be merged**, while a green one can be merged without any approval; (2) a green pull request that is behind `main` cannot be merged until it is updated, and a force-push to `main` is rejected. Each result is noted with the pull-request number or the rejection message.

- [ ] **T13 — Demonstrations 3, 4 and 6: deployment and verification** `⚠️ approval` `[manual]`
  - Depends on: T11, T12
  - Files: — (throwaway branches and pull requests; temporary platform setting)
  - RF: RF-9, RF-10, RF-12, RF-13, RF-14, RF-15, RF-20
  - Done when: (3) merging a green pull request produces a production deployment, the same checks on the resulting commit, and a preview address on pull requests; (4) the verification is green on a healthy deployment and **red** when run manually against a preview deployed with the Preview-scoped token removed (never against production), after which the variable is **restored**; (6) a pull request with a deliberately broken build shows a failed preview deployment while production keeps serving the previous version. Each result is noted; the variable is confirmed restored for Production and Preview. It also records whether a failure notification actually reached the maintainer for the red verification (evidence, not a requirement) and where the maintainer should look.

- [ ] **T14 [P] — Demonstration 5: repository fields**
  - Depends on: T10
  - Files: — (read-only check)
  - RF: RF-18
  - Done when: the repository's description and website field, read with the `gh` CLI, contain no deployment address, and the output is noted.

- [ ] **T15 [P] — Stability of the required checks**
  - Depends on: T08
  - Files: — (platform runs)
  - RF: non-functional "Stable checks"
  - Done when: the CI of one commit has run **five times in a row** on the platform (re-runs started on purpose as a measurement, not to recover from a failure) and all five runs are green on the first attempt, each finishing in under 10 minutes (durations noted). If any run fails intermittently, the cause is recorded as a defect and fixed — with the maintainer's approval whenever it means editing an existing test — and the count restarts.

- [ ] **T16 — Record and close**
  - Depends on: T12, T13, T14, T15
  - Files: — (the merged pull request's description)
  - RF: all (Definition of done)
  - Done when: the pull request description lists the six demonstrations and the stability result, each with its evidence; `pnpm typecheck`, `pnpm lint`, the full suite and `pnpm build` pass on `main`; the dependency sections of `package.json` are identical to those of the branch's base commit (recorded in the pull request); the production address appears nowhere in the repository; every checkbox in this file is ticked.
