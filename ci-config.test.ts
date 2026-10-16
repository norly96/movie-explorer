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
