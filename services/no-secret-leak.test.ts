import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FORBIDDEN_STRING = "TMDB_ACCESS_TOKEN";
// Only real source directories — not .env.example or docs, which
// document the name on purpose.
const SCAN_DIRS = ["app", "components", "hooks", "stores"];
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

function collectSourceFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return []; // directory doesn't exist yet (e.g. hooks/, stores/)
  }

  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      return collectSourceFiles(fullPath);
    }
    return SOURCE_EXTENSIONS.some((ext) => fullPath.endsWith(ext))
      ? [fullPath]
      : [];
  });
}

describe("no-secret-leak", () => {
  it(`never references ${FORBIDDEN_STRING} outside services/ (RF-7)`, () => {
    const offendingFiles = SCAN_DIRS.flatMap(collectSourceFiles).filter(
      (filePath) => readFileSync(filePath, "utf-8").includes(FORBIDDEN_STRING)
    );

    expect(offendingFiles).toEqual([]);
  });
});
