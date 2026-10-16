import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Reads the repository's automation and configuration files as text (there is
// no YAML parser, and constitution §1 forbids adding one) and asserts the
// essentials. The real runs on the platforms are the proof of behavior; see
// specs/deploy-ci/plan.md → Test strategy.

interface PackageJson {
  scripts?: Record<string, string>;
  engines?: Record<string, string>;
}

function readPackageJson(): PackageJson {
  return JSON.parse(readFileSync("package.json", "utf-8")) as PackageJson;
}

describe("package.json", () => {
  it("has a typecheck script that runs the compiler without emitting (RF-5)", () => {
    const { scripts } = readPackageJson();

    expect(scripts?.typecheck).toBeDefined();
    expect(scripts?.typecheck).toMatch(/\btsc\b/);
    expect(scripts?.typecheck).toMatch(/--noEmit\b/);
  });

  it("declares the supported Node.js version once, as a major-version range (RF-3)", () => {
    const { engines } = readPackageJson();

    expect(engines?.node).toBe("24.x");
  });

  it("makes the lint script fail on any warning (RF-1)", () => {
    const { scripts } = readPackageJson();

    expect(scripts?.lint).toMatch(/\beslint\b/);
    expect(scripts?.lint).toMatch(/--max-warnings[= ]0\b/);
  });
});

// --- .github/workflows/ci.yml ------------------------------------------------

const JOBS = ["lint", "typecheck", "test", "build"] as const;

function readWorkflow(file: string): string {
  return readFileSync(`.github/workflows/${file}`, "utf-8");
}

// The text of one job: from its key under `jobs:` to the next job (or the end).
function jobBlock(workflow: string, job: string): string {
  const jobs = workflow.split(/^jobs:\s*$/m)[1] ?? "";
  const match = jobs.match(
    new RegExp(`^  ${job}:\\s*$([\\s\\S]*?)(?=^  [\\w-]+:\\s*$|(?![\\s\\S]))`, "m")
  );
  return match?.[1] ?? "";
}

describe("ci.yml", () => {
  const workflow = readWorkflow("ci.yml");

  it("runs on pull requests to main and on pushes to main (RF-1, RF-20)", () => {
    expect(workflow).toMatch(/^on:\s*$/m);
    expect(workflow).toMatch(/^ {2}pull_request:\s*\n {4}branches: \[main\]/m);
    expect(workflow).toMatch(/^ {2}push:\s*\n {4}branches: \[main\]/m);
  });

  it("has four independent jobs named exactly lint, typecheck, test and build (RF-1, RF-7)", () => {
    const keys = [...(workflow.split(/^jobs:\s*$/m)[1] ?? "").matchAll(/^ {2}([\w-]+):\s*$/gm)].map(
      (match) => match[1]
    );

    expect(keys).toEqual([...JOBS]);
    for (const job of JOBS) {
      expect(jobBlock(workflow, job)).toMatch(new RegExp(`^ {4}name: ${job}\\s*$`, "m"));
      expect(jobBlock(workflow, job)).not.toMatch(/^ {4}needs:/m);
    }
  });

  it("runs each job's own command (RF-1, RF-5, RF-6)", () => {
    for (const job of JOBS) {
      expect(jobBlock(workflow, job)).toMatch(new RegExp(`run: pnpm ${job}\\s*$`, "m"));
    }
  });

  it("gives the workflow a read-only token on contents (NFR security)", () => {
    expect(workflow).toMatch(/^permissions:\s*\n {2}contents: read\s*$/m);
    expect(workflow).not.toMatch(/: write\b/);
  });

  it("installs from the frozen lockfile in every job (RF-4)", () => {
    for (const job of JOBS) {
      expect(jobBlock(workflow, job)).toMatch(/run: pnpm install --frozen-lockfile\s*$/m);
    }
  });

  it("reads the Node.js version from package.json and activates pnpm with Corepack (RF-3)", () => {
    for (const job of JOBS) {
      const block = jobBlock(workflow, job);
      expect(block).toMatch(/node-version-file: package\.json/);
      expect(block).toMatch(/run: corepack enable\s*$/m);
    }
    expect(workflow).not.toMatch(/^\s*node-version:/m);
  });

  it("cancels superseded runs of pull requests but never runs on main (RF-2, RF-20)", () => {
    expect(workflow).toMatch(/^concurrency:\s*$/m);
    expect(workflow).toMatch(/cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
    // Pushes get a group of their own, so none is replaced by a newer one.
    expect(workflow).toMatch(/group: .*github\.run_id/);
    expect(workflow).toMatch(/group: .*github\.event\.pull_request\.number/);
  });

  it("references no secret (RF-6)", () => {
    expect(workflow).not.toMatch(/\bsecrets\b/i);
    expect(workflow).not.toMatch(/TMDB/);
  });

  it("pins every outside step to a 40-character commit and only uses GitHub's own actions", () => {
    const uses = [...workflow.matchAll(/^\s*-?\s*uses:\s*(\S+)(.*)$/gm)];

    expect(uses.length).toBeGreaterThan(0);
    for (const [, reference, rest] of uses) {
      expect(reference).toMatch(/^actions\/[\w.-]+@[0-9a-f]{40}$/);
      // The released version is recorded next to the commit.
      expect(rest).toMatch(/#\s*v\d+\.\d+\.\d+/);
    }
  });

  it("has no path filter, so documentation-only changes run every check (RF-1)", () => {
    expect(workflow).not.toMatch(/\bpaths(-ignore)?:/);
  });

  it("has no end-to-end step", () => {
    expect(workflow).not.toMatch(/playwright|test:e2e|\be2e\b/i);
  });
});

// --- .github/workflows/verify-deployment.yml ---------------------------------

describe("verify-deployment.yml", () => {
  const workflow = readWorkflow("verify-deployment.yml");
  const job = jobBlock(workflow, "verify");

  it("runs on deployment status events and manually with an optional address (RF-13, RF-15)", () => {
    expect(workflow).toMatch(/^on:\s*$/m);
    expect(workflow).toMatch(/^ {2}deployment_status:/m);
    expect(workflow).toMatch(/^ {2}workflow_dispatch:\s*\n {4}inputs:\s*\n {6}address:/m);
    const input = workflow.match(/^ {6}address:\s*\n((?: {8}.*\n)+)/m)?.[1] ?? "";
    expect(input).toMatch(/required: false/);
    expect(workflow).not.toMatch(/^ {2}(push|pull_request):/m);
  });

  it("verifies automatically only a successful deployment of the production environment (RF-13)", () => {
    expect(job).toMatch(/^ {4}if: .*github\.event_name == 'workflow_dispatch'/m);
    expect(job).toMatch(/github\.event\.deployment_status\.state == 'success'/);
    // The environment name comes from the event, compared with the platform's own name.
    expect(job).toMatch(/github\.event\.deployment\.environment == 'Production'/);
  });

  it("probes the event's own deployment address, or the given one, or PRODUCTION_URL (RF-13, RF-15)", () => {
    expect(workflow).toMatch(/github\.event\.deployment_status\.(environment_url|target_url)/);
    expect(workflow).toMatch(/inputs\.address/);
    expect(workflow).toMatch(/vars\.PRODUCTION_URL/);
    expect(job).toMatch(/node [^\n]*scripts\/verify-deployment-cli\.ts "\$TARGET"/);
  });

  it("contains no literal deployment address (RF-18)", () => {
    expect(workflow).not.toMatch(/https?:\/\/[^\s"']*[\w-]+\.[\w-]+/);
    expect(workflow).not.toMatch(/vercel\.app/i);
  });

  it("runs the script directly on the declared Node.js version, with no install step", () => {
    expect(job).toMatch(/node-version-file: package\.json/);
    expect(job).toMatch(/--disable-warning=MODULE_TYPELESS_PACKAGE_JSON/);
    expect(job).not.toMatch(/pnpm|npm |corepack/);
  });

  it("writes the deployment-health status on the deployed commit (RF-14)", () => {
    expect(job).toMatch(/context=deployment-health/);
    expect(job).toMatch(/statuses\/\$SHA/);
    expect(job).toMatch(/SHA: \$\{\{ github\.event\.deployment\.sha \|\| github\.sha \}\}/);
    // The final status is written even when the verification fails.
    expect(job).toMatch(/if: always\(\)/);
    for (const state of ["pending", "success", "failure"]) {
      expect(job).toMatch(new RegExp(`\\b${state}\\b`));
    }
  });

  it("grants statuses: write to the verifying job only, everything else read-only", () => {
    expect(workflow).toMatch(/^permissions:\s*\n {2}contents: read\s*$/m);
    expect(workflow.match(/statuses: write/g)).toHaveLength(1);
    expect(job).toMatch(/^ {4}permissions:\s*\n {6}contents: read\s*\n {6}statuses: write\s*$/m);
    expect(workflow).not.toMatch(/(contents|deployments|actions|id-token): write/);
  });

  it("pins every outside step to a 40-character GitHub commit, like ci.yml", () => {
    const uses = [...workflow.matchAll(/^\s*-?\s*uses:\s*(\S+)(.*)$/gm)];

    expect(uses.length).toBeGreaterThan(0);
    for (const [, reference, rest] of uses) {
      expect(reference).toMatch(/^actions\/[\w.-]+@[0-9a-f]{40}$/);
      expect(rest).toMatch(/#\s*v\d+\.\d+\.\d+/);
    }
  });

  it("does not roll anything back or change the deployment (RF-14)", () => {
    expect(workflow).not.toMatch(/rollback|promote|revert|redeploy|vercel /i);
    expect(workflow).not.toMatch(/gh api [^\n]*(-X|--method)[ =](DELETE|PUT|PATCH)/i);
    expect(workflow).not.toMatch(/\/deployments\b/);
  });
});
