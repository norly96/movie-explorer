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
