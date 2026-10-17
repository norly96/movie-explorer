import { readdirSync, readFileSync } from "node:fs";
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

  it("generates Next.js route types before type checking, so a clean checkout passes (RF-5)", () => {
    const { scripts } = readPackageJson();

    // PageProps and LayoutProps are generated into .next/types, which git ignores.
    expect(scripts?.typecheck).toMatch(/\bnext typegen\b.*&&.*\btsc\b/);
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

  it("makes a failing verification fail the step, even though its output is piped to tee (RF-14)", () => {
    // Without an explicit shell GitHub runs bash without pipefail, so the
    // script's exit code would be lost behind `tee` and a red result would
    // be recorded as success.
    const step = job.split(/^ {6}- name: /m).find((text) => text.startsWith("Verify the deployment")) ?? "";

    expect(step).toMatch(/\| tee verify\.log/);
    expect(step).toMatch(/^ {8}shell: bash\s*$/m);
  });

  it("hands the bypass credential to the verifying step only, as an environment variable (RF-22)", () => {
    const secretLines = workflow.match(/secrets\.[A-Z_]+/g) ?? [];
    expect(secretLines).toEqual(["secrets.VERCEL_AUTOMATION_BYPASS_SECRET"]);

    const steps = job.split(/^ {6}- /m);
    const holders = steps.filter((text) => /secrets\./.test(text));
    expect(holders).toHaveLength(1);
    expect(holders[0]).toMatch(/^name: Verify the deployment/);
    expect(holders[0]).toMatch(
      /^ {10}VERCEL_AUTOMATION_BYPASS_SECRET: \$\{\{ secrets\.VERCEL_AUTOMATION_BYPASS_SECRET \}\}\s*$/m
    );
    // Never on the command line, where it would show in process listings.
    expect(workflow).not.toMatch(/--bypass|bypass-secret/);
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

// --- docs/deployment/ruleset-*.json ------------------------------------------

// Subset of GitHub's ruleset API (specs/deploy-ci/plan.md → Data model).
interface RulesetDefinition {
  name: string;
  target: "branch";
  enforcement: "active";
  conditions: { ref_name: { include: string[]; exclude: string[] } };
  bypass_actors: {
    actor_type: string;
    actor_id: number | "__ADMIN_ROLE_ID__";
    bypass_mode: "always" | "pull_request";
  }[];
  rules: { type: string; parameters?: unknown }[];
}

function readRuleset(file: string): RulesetDefinition {
  return JSON.parse(
    readFileSync(`docs/deployment/${file}`, "utf-8")
  ) as RulesetDefinition;
}

function ruleTypes(ruleset: RulesetDefinition): string[] {
  return ruleset.rules.map((rule) => rule.type);
}

describe("ruleset-main-gate.json", () => {
  const gate = readRuleset("ruleset-main-gate.json");
  type StatusChecks = {
    strict_required_status_checks_policy: boolean;
    required_status_checks: { context: string }[];
  };
  const checks = gate.rules.find((rule) => rule.type === "required_status_checks")
    ?.parameters as StatusChecks | undefined;

  it("is an active branch ruleset for main only", () => {
    expect(gate.target).toBe("branch");
    expect(gate.enforcement).toBe("active");
    expect(gate.conditions.ref_name.include).toEqual(["refs/heads/main"]);
    expect(gate.conditions.ref_name.exclude).toEqual([]);
  });

  it("requires exactly the four job names found in ci.yml (RF-7)", () => {
    const workflow = readWorkflow("ci.yml");
    const jobNames = [
      ...(workflow.split(/^jobs:\s*$/m)[1] ?? "").matchAll(/^ {4}name: (.+?)\s*$/gm),
    ].map((match) => match[1]);

    expect(jobNames).toEqual([...JOBS]);
    expect(checks?.required_status_checks.map((check) => check.context)).toEqual(
      jobNames
    );
  });

  it("requires the branch to be up to date with main (RF-19)", () => {
    expect(checks?.strict_required_status_checks_policy).toBe(true);
  });

  it("requires only the checks: no review rule (RF-8)", () => {
    expect(ruleTypes(gate)).toEqual(["required_status_checks"]);
    expect(ruleTypes(gate)).not.toContain("pull_request");
  });

  it("has one owner bypass whose role is a placeholder to look up, never a guess (RF-7)", () => {
    expect(gate.bypass_actors).toHaveLength(1);
    expect(gate.bypass_actors[0]).toEqual({
      actor_type: "RepositoryRole",
      actor_id: "__ADMIN_ROLE_ID__",
      bypass_mode: "always",
    });
  });
});

describe("ruleset-main-history.json", () => {
  const history = readRuleset("ruleset-main-history.json");

  it("is an active branch ruleset for main only", () => {
    expect(history.target).toBe("branch");
    expect(history.enforcement).toBe("active");
    expect(history.conditions.ref_name.include).toEqual(["refs/heads/main"]);
  });

  it("forbids force-pushes and deletion of main (RF-21)", () => {
    expect(ruleTypes(history).sort()).toEqual(["deletion", "non_fast_forward"]);
  });

  it("has no bypass entry, so nobody can rewrite main (RF-21)", () => {
    expect(history.bypass_actors).toEqual([]);
  });

  it("is a separate ruleset from the gate, with a different name", () => {
    expect(history.name).not.toBe(readRuleset("ruleset-main-gate.json").name);
  });
});

// --- README "Deployment" guide -----------------------------------------------

function readDeploymentGuide(): string {
  const readme = readFileSync("README.md", "utf-8");
  const section = readme.split(/^## Deployment\s*$/m)[1];
  return (section ?? "").split(/^## /m)[0];
}

function trackedTextFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? trackedTextFiles(path) : [path];
  });
}

describe("README deployment guide", () => {
  const guide = readDeploymentGuide();

  it("replaces the generic Deploy on Vercel boilerplate (RF-17)", () => {
    expect(guide.length).toBeGreaterThan(0);
    expect(readFileSync("README.md", "utf-8")).not.toMatch(/^## Deploy on Vercel/m);
  });

  it("names the token variable and both environments it is needed in (RF-11, RF-17)", () => {
    expect(guide).toContain("TMDB_ACCESS_TOKEN");
    expect(guide).toMatch(/\bProduction\b/);
    expect(guide).toMatch(/\bPreview\b/);
    expect(guide).toMatch(/sensitive/i);
  });

  it("explains how to connect the platform (RF-17)", () => {
    expect(guide).toMatch(/connect/i);
    expect(guide).toMatch(/Vercel/);
    expect(guide).toMatch(/GitHub repository/i);
  });

  it("explains how to apply both rulesets, including the administrator role placeholder (RF-7, RF-17, RF-19, RF-21)", () => {
    expect(guide).toContain("docs/deployment/ruleset-main-gate.json");
    expect(guide).toContain("docs/deployment/ruleset-main-history.json");
    expect(guide).toContain("__ADMIN_ROLE_ID__");
    expect(guide).toMatch(/gh api/);
    expect(guide).toMatch(/administrator role/i);
    expect(guide).toMatch(/after .*(checks|CI).* (ran|run) on `?main`?/i);
  });

  it("explains the manual verification and the PRODUCTION_URL variable without giving its value (RF-15)", () => {
    expect(guide).toContain("PRODUCTION_URL");
    expect(guide).toMatch(/repository variable/i);
    expect(guide).toMatch(/gh variable set PRODUCTION_URL/);
    expect(guide).toMatch(/gh workflow run/);
    expect(guide).toMatch(/Verify deployment/);
    expect(guide).toMatch(/address/i);
  });

  it("explains how to verify a preview deployed without the token (RF-15)", () => {
    expect(guide).toMatch(/Preview[- ]scoped/i);
    expect(guide).toMatch(/remove/i);
    expect(guide).toMatch(/restore/i);
  });

  it("says where to look for a failure, since a notification may not arrive (RF-14)", () => {
    expect(guide).toContain("deployment-health");
    expect(guide).toMatch(/Actions tab/i);
    expect(guide).toMatch(/notification/i);
  });

  it("explains how to roll back manually (RF-16, RF-17)", () => {
    expect(guide).toMatch(/roll back/i);
    expect(guide).toMatch(/previous deployment/i);
  });

  it("publishes no address on the platform's default domain anywhere tracked (RF-18)", () => {
    const files = [
      "README.md",
      ...trackedTextFiles("docs"),
      ...trackedTextFiles("specs"),
      ...trackedTextFiles(".github"),
    ].filter((file) => /\.(md|json|ya?ml)$/.test(file));

    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      expect(readFileSync(file, "utf-8"), file).not.toMatch(
        /[\w-]+\.vercel\.app/i
      );
    }
  });
});
