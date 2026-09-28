import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe(".env.example", () => {
  it("exists at the project root", () => {
    expect(existsSync(".env.example")).toBe(true);
  });

  it("documents TMDB_ACCESS_TOKEN with no real value committed", () => {
    const content = readFileSync(".env.example", "utf-8");
    const line = content
      .split("\n")
      .find((entry) => entry.trim().startsWith("TMDB_ACCESS_TOKEN="));

    expect(line).toBeDefined();
    // "=" followed by nothing (until an optional trailing comment) means
    // no real token was committed.
    expect(line).toMatch(/^TMDB_ACCESS_TOKEN=\s*(#.*)?$/);
  });
});
