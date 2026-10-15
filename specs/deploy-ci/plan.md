# Plan — Deployment and continuous integration

Spec: [`specs/deploy-ci/spec.md`](./spec.md) (RF-1 to RF-21).
No implementation code below — types, interfaces and structure only.

This feature adds **no application code and no new route**: it adds
automation (GitHub Actions), one small verification script, repository
configuration, platform settings (GitHub rulesets, Vercel) and documentation.
The sections below keep the plan's usual shape and map it onto that:
"modules" are files and settings, the "component tree" is the pipeline,
"state and routes" are events, statuses and the URLs the verification probes,
and the "data model" is the script's types and the configuration shapes.

## Modules

| Module | Kind | Responsibility | RF |
|---|---|---|---|
| `.github/workflows/ci.yml` (new) | Workflow | Four independent jobs — `lint`, `typecheck`, `test`, `build` — on pull requests to `main` and on pushes to `main`; read-only token; install from the frozen lockfile; no secrets; cancels superseded pull-request runs | RF-1, 2, 3, 4, 6, 20 |
| `.github/workflows/verify-deployment.yml` (new) | Workflow | Runs the verification when Vercel reports a successful **Production** deployment, or manually with an optional address; writes the commit status `deployment-health` on the deployed commit | RF-13, 14, 15, 16 |
| `scripts/verify-deployment.ts` (new) | Script (library) | Pure decision logic: probe the home page and `/api/explore`, return a structured result. Dependency-free (Node built-ins only) | RF-13, 14 |
| `scripts/verify-deployment-cli.ts` (new) | Script (entry) | Parses the address, calls the library, prints a readable report, sets the exit code (0 healthy, 1 unhealthy, 2 bad usage) | RF-14, 15 |
| `package.json` (modified) | Config | `typecheck` script; `engines.node` as the single declaration of the Node.js version; `lint` made to fail on warnings | RF-1, 3, 5 |
| `docs/deployment/ruleset-main-gate.json` (new) | Config (reference) | Definition of the ruleset that blocks merging while checks fail, requires an up-to-date branch, no review approvals, owner bypass | RF-7, 8, 19 |
| `docs/deployment/ruleset-main-history.json` (new) | Config (reference) | Definition of the ruleset that forbids force-push and deletion of `main`, **no bypass** | RF-21 |
| `README.md` (modified) | Docs | "Deployment" guide: connect the platform, environment variable for production **and** preview, apply the rulesets, run the verification manually, roll back manually; replaces the generic "Deploy on Vercel" boilerplate; contains no deployment address | RF-16, 17, 18 |
| GitHub repository rulesets (settings) | Platform | The two rulesets above, applied from the JSON files with the `gh` CLI (a manual step, approved at that moment) | RF-7, 8, 19, 21 |
| Vercel project (settings) | Platform | Git integration with `main` as the production branch; preview deployments for pull requests; `TMDB_ACCESS_TOKEN` as a sensitive server-side variable for Production and Preview | RF-9, 10, 11, 12 |
| `ci-config.test.ts` (new, project root) | Test | Reads workflows, `package.json`, rulesets and docs as text/JSON and asserts the essentials | RF-1–8, 11, 13–21 (see matrix) |
| `scripts/verify-deployment.test.ts`, `scripts/verify-deployment-cli.test.ts` (new) | Tests | Decision logic with mocked responses; the entry point on the declared Node.js version | RF-13, 14, 15 |

Naming follows `AGENTS.md`: everything that is not a component or hook is
kebab-case. Unit tests live next to their file, except the one that spans
several configuration files, which sits at the root like the existing
`env-example.test.ts` and `next.config.test.ts`.

## Pipeline tree (the "component tree")

```
GitHub
├─ Pull request → main            ─┐
├─ Push to main (merge or direct) ─┤  .github/workflows/ci.yml  (name: "CI")
│                                  │    ├─ job "lint"       pnpm lint            (warnings fail)
│                                  │    ├─ job "typecheck"  pnpm typecheck
│                                  │    ├─ job "test"       pnpm test            (Vitest + MSW, no network)
│                                  │    └─ job "build"      pnpm build           (no secrets)
│                                  │    each job: checkout → Node (from package.json) → pnpm (corepack)
│                                  │              → install --frozen-lockfile → command
│
├─ Merge gate (rulesets, not files)
│    ├─ ruleset "main-gate":     4 required checks · branch up to date · no approvals · admin bypass
│    └─ ruleset "main-history":  no force-push · no deletion · no bypass
│
Vercel (Git integration)
├─ Pull request  → Preview deployment  → URL shown on the PR (maintainer-only, may require login)
└─ Push to main  → Production deployment ─┐
                                          │  GitHub "deployment_status" event (state: success, environment: Production)
                                          ▼
          .github/workflows/verify-deployment.yml (name: "Verify deployment")
            ├─ trigger A: deployment_status  → target = that deployment's own address
            ├─ trigger B: workflow_dispatch  → target = given address, else the production address
            └─ job "verify": checkout → Node → run scripts/verify-deployment-cli.ts <target>
                              → commit status "deployment-health" on the deployed commit
```

## State and routes

**Application routes: none added.** The verification only reads two existing
URLs of the deployed app:

| Probe | URL | Healthy when |
|---|---|---|
| `home` | `/` | success status (2xx) |
| `movie-list-api` | `/api/explore?page=1` | success status **and** JSON with a `movies` array of at least one item |

**Event → workflow map**

| Event | Workflow | Notes |
|---|---|---|
| `pull_request` (base `main`) | CI | Concurrency group per pull request, **cancels** superseded runs (RF-2) |
| `push` (branch `main`) | CI | Same jobs, **never cancelled**, so every commit on `main` has a complete set of statuses (RF-20) |
| `deployment_status` (success, Production) | Verify deployment | Ignored for Preview environments (the spec only verifies production automatically) |
| `workflow_dispatch` (optional input: address) | Verify deployment | Manual re-run and the only way to probe a preview (RF-15) |

**Status states** (what the maintainer sees, from the spec's UI states)

| Subject | pending | success | failure | cancelled |
|---|---|---|---|---|
| Pull-request check | running | green, counts toward the gate | red, merge blocked | superseded run |
| Commit status `deployment-health` | probing | both probes healthy | a probe failed | — |
| Vercel deployment | building | live | build failed, previous version stays live | — |

## Data model (types and configuration shapes)

```ts
// scripts/verify-deployment.ts — only erasable TypeScript syntax (no enums,
// namespaces or parameter properties), so Node.js runs it without a build step.
export type ProbeName = "home" | "movie-list-api";

export interface ProbeResult {
  probe: ProbeName;
  url: string;            // the address that was requested
  ok: boolean;
  status: number | null;  // null when no response arrived (network error, timeout)
  detail: string;         // human-readable reason when ok is false
}

export interface VerificationResult {
  target: string;         // base address, without a trailing slash
  healthy: boolean;       // true only if every probe is ok
  probes: ProbeResult[];  // always both probes, in a fixed order
}

export interface VerifyOptions {
  timeoutMs: number;      // applied to each request separately
  fetchFn?: typeof fetch; // injectable, defaults to the global fetch
}

export function verifyDeployment(
  target: string,
  options: VerifyOptions
): Promise<VerificationResult>;
```

```ts
// scripts/verify-deployment-cli.ts — contract only
// usage:  node scripts/verify-deployment-cli.ts <address> [--timeout <ms>]
// exit codes: 0 = healthy · 1 = unhealthy (report printed) · 2 = bad usage
```

```ts
// Names the merge gate refers to; the test keeps workflow job names and the
// ruleset definition in sync (RF-1 "separate status", "stable names" NFR).
export type RequiredCheckName = "lint" | "typecheck" | "test" | "build";

// Shape of docs/deployment/*.json (subset of GitHub's ruleset API).
export interface RulesetDefinition {
  name: string;
  target: "branch";
  enforcement: "active";
  conditions: { ref_name: { include: string[]; exclude: string[] } };
  bypass_actors: { actor_type: string; bypass_mode: "always" | "pull_request" }[];
  rules: { type: string; parameters?: unknown }[];
}

// Commit status written by the verification (RF-13).
export interface DeploymentHealthStatus {
  context: "deployment-health";
  state: "pending" | "success" | "failure";
  description: string;    // e.g. "home: 200, movie-list-api: 502"
  target_url: string;     // link to the workflow run
}
```

`package.json` gains: `scripts.typecheck`, `engines.node`, and a `lint` script
that fails on warnings. No dependency is added.

## Decisions

1. **GitHub Actions is the CI.** The merge gate and the statuses live in
   GitHub, so the checks must report there. *Rejected*: relying on the hosting
   platform's build as the only check — it builds but does not run lint, types
   or tests, and it gates nothing. (RF-1, 7)
2. **Four separate jobs, not one job with four steps.** The spec asks for each
   check as its own status; separate jobs also run in parallel and give the
   merge gate stable names to require. *Rejected*: a single job — one combined
   status and the first failure hides the others. Cost accepted: four
   installs per run (mitigated by the package-manager cache). (RF-1, 7)
3. **pnpm is activated with Corepack from the `packageManager` field.** It
   uses the version the project already declares and needs no extra action.
   *Rejected*: the pnpm project's own setup action — it is third-party, and the
   spec limits outside steps to those published by GitHub. (RF-3, NFR Security)
4. **The Node.js version is declared once, in `engines.node` of
   `package.json`** (a major-version range, currently `24.x`), read by the
   Node setup step in CI and by Vercel. *Rejected*: `.nvmrc` — Vercel does not
   read it, which would leave two places to keep in sync. *Rejected*: pinning an
   exact patch version — it would force a commit for every Node.js patch
   release. (RF-3)
5. **Outside steps are pinned by full commit identifier, with the version in a
   comment, and limited to GitHub's own actions** (checkout, Node setup).
   *Rejected*: version tags — a tag can be moved after the fact, which matters
   in a public repository. Maintenance cost accepted: updating the identifiers
   is manual (dependency update bots are out of scope). (NFR Security)
6. **The `lint` script itself fails on warnings** instead of adding a separate
   CI-only command. Local and CI results are then identical, which is the
   point of RF-3. *Rejected*: a `lint:ci` script — two commands that can drift
   apart. (RF-1)
7. **The verification is a small TypeScript script, run by Node's built-in
   type stripping, with no dependency.** The decision logic becomes testable
   (§5) and the workflow needs no install step. *Rejected*: `curl` in the
   workflow file — untestable, so RF-13/14 could only be demonstrated.
   *Rejected*: `tsx` or Zod in the script — a new dependency (§1) and an
   install step in a workflow that runs with extra permissions. The response is
   checked with a small hand-written type guard; it is our own API's response,
   not a TMDB response, so §4 does not require Zod here. (RF-13, 14)
8. **The script is split into a pure library and a tiny entry point.** The
   library is unit-tested with mocked HTTP; the entry point is tested by
   actually running it on the declared Node.js version, which also proves the
   type-stripping assumption holds there. *Rejected*: one file that runs on
   import — it cannot be imported by tests without side effects. (RF-13–15)
9. **Verification is triggered by the `deployment_status` event Vercel emits,
   restricted to the Production environment, plus `workflow_dispatch`.** The
   event carries that deployment's own address and commit, which is exactly
   what RF-13 asks for. *Rejected*: making the CI workflow wait for the Vercel
   deployment — it couples CI duration to the platform and races with it.
   *Rejected*: probing the production domain automatically — with two merges
   close together an old verification could validate the newer deployment.
   (RF-13, 15)
10. **The result is written as an explicit commit status on the deployed
    commit's identifier** (`deployment-health`), not only as the workflow
    run's own result. For `deployment_status` events GitHub attaches the run to
    the default branch's latest commit, which can differ from the deployed one
    when two deployments overlap. The job gets `statuses: write` and nothing
    more. *Rejected*: relying on the run result alone — the status could land
    on the wrong commit. (RF-13, 14; NFR Security)
11. **Merge gate and history protection are two separate rulesets.** RF-7
    needs an owner bypass; RF-21 needs none (nobody should be able to
    force-push or delete `main`). A ruleset's bypass list applies to all its
    rules, so one ruleset cannot express both. *Rejected*: classic branch
    protection — its "include administrators" switch is all-or-nothing and
    would either let the owner force-push or remove the emergency bypass.
    (RF-7, 21)
12. **The rulesets are kept as JSON in `docs/deployment/` and applied by hand
    with `gh`.** The definitions are reviewable and testable, and re-applying
    them is one command. *Rejected*: a workflow that applies them
    automatically — it would need a token with repository-administration
    rights stored as a secret, against RF-6 and the security requirement.
    Accepted limit: the files describe the intended rules; they cannot show
    whether the applied rules drifted (see the demonstrations). (RF-7, 8, 19, 21)
13. **No pull-request-review rule in the gate** (RF-8) and **"require branch to
    be up to date"** turned on (RF-19). Friction accepted: when several
    branches are open, merging one makes the others need an update.
14. **CI also runs on pushes to `main`, without cancellation.** Every commit
    that reaches `main` — including an owner bypass or a direct push — gets a
    full set of statuses. *Rejected*: pull-request-only CI — a bypassed commit
    would be deployed with no checks at all. (RF-20)
15. **Repository-side tests read configuration as text or JSON.** There is no
    YAML parser and §1 forbids adding one, so the tests assert the essentials
    by pattern (commands, job names, permissions, pinned identifiers, absence
    of secret references, concurrency rule). The real run is what proves
    behavior. *Rejected*: an extra dependency to parse YAML. *Rejected*: no
    tests for the workflows — §5. (RF-1–6, 13–21)
16. **The token is a Vercel "sensitive" variable, named `TMDB_ACCESS_TOKEN`,
    set for both Production and Preview.** Same name as locally, so no code
    change; sensitive so it cannot be read back from the dashboard. (RF-11)
17. **End-to-end tests stay out of the workflows** (spec, out of scope).
    Unit tests use MSW and never touch the network, so the required checks are
    deterministic.

## Rollout order (the order matters)

1. **Repository files first, through a normal pull request** (workflows,
   script, `package.json`, rulesets JSON, README). The pull request that adds
   the CI runs the CI on itself, because pull-request workflows use the
   definition in the branch.
2. **Connect Vercel and set the variable** for Production and Preview. Until
   then nothing is deployed and nothing breaks.
3. **Apply the rulesets only after the checks have run at least once.** A
   required check that has never reported blocks every merge, including the one
   that would fix it. The bypass exists for this case, but it is not the plan.
4. **The verification workflow must already be on `main` before the first
   production deployment it should judge:** `deployment_status` workflows run
   with the default branch's definition, so a definition that exists only in a
   branch is ignored.
5. **Run the demonstrations** of the spec's Definition of done and record them
   in the pull request description.

## Risks

1. **The build might need the token.** *Checked:* `pnpm build` completes
   without `TMDB_ACCESS_TOKEN` and without `.env.local` (all four routes
   listed). Because every page that reads the token is dynamic, the token is
   only read per request. If a future change makes a page static, the CI build
   would fail without a secret — the `build` job is the tripwire. (RF-6)
2. **Node.js 24 on the platforms.** Vercel's supported versions and the
   Node setup step must both accept `24.x`. Mitigation: confirm in the Vercel
   project settings when connecting it; fall back to `22.x` in `engines.node`
   (and re-check that the script still runs, since it relies on type
   stripping, which is on by default in 22.18+ and 24). (RF-3, 13)
3. **`deployment_status` details.** The event can arrive before the address is
   reachable, the production environment's name is case-sensitive, and the
   deployment's address field can be empty on some states. Mitigation: the
   script retries a few times within a bounded window before declaring a
   failure; the workflow reads the environment name from the event instead of
   hard-coding it, and exits early on any state other than success. (RF-13)
4. **Failure notifications may not reach the maintainer.** A workflow run
   triggered by a deployment event is attributed to the integration, not to
   the maintainer, so GitHub's usual failure email may not be sent. Mitigation:
   the red `deployment-health` status is on the commit itself, and the README
   tells the maintainer where to look. The spec accepts the platform's normal
   notifications and builds none of its own. (RF-14)
5. **Flaky timing-based tests would block merges.** Several tests wait on real
   timers (the debounce, infinite-scroll and query tests). Slower runners can
   expose races. Mitigation: the Definition of done requires five consecutive
   green runs of the same commit; any intermittent failure is a defect to fix
   with the maintainer's approval, never a re-run. (NFR Stable checks)
6. **Lint warnings can fail the check.** Today `pnpm lint` is clean, so
   making warnings fail should pass; a future warning will block until fixed,
   which is the intent. (RF-1)
7. **Rulesets cannot be verified by tests.** The JSON files are tested; the
   applied state is shown only by the demonstrations. Accepted drift risk; the
   README documents how to re-apply and inspect them. (RF-7, 8, 19, 21)
8. **The owner-bypass identifier must not be guessed.** The ruleset needs the
   administrator role's identifier, which is looked up through the API when the
   ruleset is applied, not hard-coded from memory. If a user-owned repository
   does not offer the administrator role as a bypass actor, the fallback is to
   bypass by temporarily disabling the ruleset, and the spec's emergency
   scenario still holds. (RF-7)
9. **Pinned identifiers go stale.** Mitigation: a comment with the version next
   to each identifier; updating is a manual, reviewed change. (NFR Security)
10. **Type stripping limits the script's syntax.** Enums, namespaces and
    parameter properties do not run. Mitigation: the entry-point test runs the
    script on the declared Node.js version, so any use of unsupported syntax
    fails a test, not a deployment. (RF-13–15)
11. **A pull request can weaken the CI** (the spec's edge case). Mitigation: the
    root test fails if the four job names, the read-only permission or the
    pinned-identifier rule disappear, so weakening needs a visible test change
    that the maintainer reviews. It does not stop a determined change; it makes
    it loud. (RF-1, NFR Security)
12. **Free-plan limits and a public proxy.** The production URL is unannounced
    but public, and `/api/explore` forwards to TMDB with the real token.
    Accepted for this iteration (cache headers are out of scope and noted for
    the performance spec). (RF-9, 11)
13. **The demonstration needs a preview without the token.** Removing the
    Preview-scoped variable temporarily, opening a pull request, running the
    manual verification against its address, and restoring the variable. The
    README lists the steps so the order is not improvised. (RF-15)

## Test strategy

| File | Covers | RF |
|---|---|---|
| `ci-config.test.ts` | `ci.yml`: triggers (pull request to `main`, push to `main`), four job names, `contents: read`, frozen-lockfile install, Node version taken from `package.json`, pnpm via Corepack, concurrency that cancels only pull-request runs, **no secret references**, every outside step pinned to a 40-character identifier and published by GitHub, no end-to-end step | RF-1, 2, 3, 4, 6, 20 |
| `ci-config.test.ts` | `package.json`: `typecheck` script runs the compiler without emitting, `engines.node` present, `lint` fails on warnings | RF-1, 3, 5 |
| `ci-config.test.ts` | `verify-deployment.yml`: triggers (`deployment_status` for Production, `workflow_dispatch` with an optional address), `statuses: write` only on the job that needs it, status context `deployment-health`, uses the event's own address, **contains no step that rolls anything back** | RF-13, 14, 15, 16 |
| `ci-config.test.ts` | `docs/deployment/*.json`: valid JSON; the gate lists exactly the four job names, strict up-to-date policy, **no review rule**, a bypass actor; the history ruleset forbids force-push and deletion and has **no bypass** | RF-7, 8, 19, 21 |
| `ci-config.test.ts` | README: deployment section names the environment variable and both environments, the rulesets, the manual verification and the manual rollback; no address on the platform's default domain in README, `docs/`, `specs/`; the existing `no-secret-leak` test keeps passing | RF-11, 16, 17, 18 |
| `scripts/verify-deployment.test.ts` (MSW) | Both probes healthy → healthy; home 5xx; API 5xx; API with an empty `movies` array; API with a body that is not the expected shape; network error; timeout; trailing slash in the target; both probes always reported | RF-13, 14 |
| `scripts/verify-deployment-cli.test.ts` | Runs the entry point as a child process on the declared Node.js version: no argument → exit 2; unreachable address → exit 1 with a readable report | RF-14, 15 |
| Recorded demonstrations (PR description) | The six items of the spec's Definition of done: red check blocks and green merges; stale branch blocked and force-push rejected; merge deploys, checks run on `main`, preview URL appears; verification green on a healthy deployment and red on a preview without the token; repository description and website field free of any address; a deliberately broken build fails on a preview while production keeps serving the previous version | RF-7, 8, 9, 10, 12, 15, 19, 20, 21 (and 14) |
| Five consecutive green runs | Stability of the required checks on the platform's runners | NFR Stable checks |

## RF coverage matrix

| RF | Where it lives | Verified by |
|---|---|---|
| RF-1 | `ci.yml` jobs; `lint` script | `ci-config.test.ts`; demonstration 1 |
| RF-2 | `ci.yml` concurrency rule | `ci-config.test.ts` |
| RF-3 | `engines.node`; Node setup and Corepack in both workflows; Vercel reads the same field | `ci-config.test.ts`; entry-point test on the declared version |
| RF-4 | frozen-lockfile install in `ci.yml` | `ci-config.test.ts` |
| RF-5 | `typecheck` script | `ci-config.test.ts`; the job runs it |
| RF-6 | `ci.yml` has no secret references; build verified without a token | `ci-config.test.ts`; risk 1 evidence |
| RF-7 | `ruleset-main-gate.json` (applied by hand) | `ci-config.test.ts` (definition); demonstration 1 (applied) |
| RF-8 | same ruleset, no review rule | `ci-config.test.ts`; demonstration 1 |
| RF-9 | Vercel Git integration, production branch `main` | demonstration 3 |
| RF-10 | Vercel preview deployments | demonstration 3 |
| RF-11 | Vercel sensitive variable for both environments | existing `no-secret-leak` test; demonstration 4 (the preview works with it, fails without) |
| RF-12 | Vercel behavior | demonstration 6 (on a preview, see "RF not covered") |
| RF-13 | script library + `verify-deployment.yml` | `verify-deployment.test.ts`; `ci-config.test.ts`; demonstration 4 |
| RF-14 | script exit code + commit status | `verify-deployment.test.ts`; entry-point test; demonstration 4 |
| RF-15 | `workflow_dispatch` input + entry-point argument | `ci-config.test.ts`; entry-point test; demonstration 4 |
| RF-16 | absence of any rollback step; README | `ci-config.test.ts`; README test |
| RF-17 | README "Deployment" section | README test |
| RF-18 | no address in docs; repository fields checked by hand | README/docs test; demonstration 5 |
| RF-19 | `ruleset-main-gate.json` (strict policy) | `ci-config.test.ts`; demonstration 2 |
| RF-20 | `ci.yml` `push` trigger on `main` | `ci-config.test.ts`; demonstration 3 |
| RF-21 | `ruleset-main-history.json` | `ci-config.test.ts`; demonstration 2 |

## Constitution check

| § | Status |
|---|---|
| 1 Minimal stack | No dependency added: Actions steps from GitHub, Corepack, Node's built-in type stripping |
| 2 Spec before code | This plan follows an approved-in-progress spec; the pull request will reference it |
| 3 Data flow | Untouched: no application code, no new fetch from the UI |
| 4 Validated boundaries | No TMDB response is read here; the script type-guards our own API's response |
| 5 Tested requirements | Automated tests for everything that lives in the repository; **scoped exception**, declared in the spec, for platform-only behavior |
| 6 No own backend | No server code added; the token stays server-side |
| 7, 8 | Not applicable to this feature |
| 9 English | Workflows, check names, scripts, docs |

## RF not covered

**None.** Every RF (RF-1 to RF-21) has at least one planned verification in the
matrix above.

One of them is verified indirectly, and that is stated openly: **RF-12** (a
failed production build leaves the previous version serving and is reported on
the commit) is verified by **demonstration 6**, on a **preview** deployment —
a pull request with a deliberately broken build fails on the pull request while
production keeps serving the previous version. That shows the same platform
behavior but is not a broken production build, which the merge gate exists to
prevent and which should never be shipped on purpose. The spec records this
limitation next to the demonstration.
