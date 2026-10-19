import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MAIN_CONTENT_ID } from "../components/SkipLink";

// The root layout provides the single main area of every page, so the skip
// link always has a target, including on pages that have no landmark of their
// own (home-redesign RF-5, RF-1). Read as text: rendering a root layout in a
// test environment needs the whole framework around it.
function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name) ? [path] : [];
  });
}

const layout = readFileSync("app/layout.tsx", "utf-8");

describe("the single main area (RF-5)", () => {
  it("is declared exactly once, in the root layout, with the id the skip link targets", () => {
    expect(layout.match(/<main\b/g)).toHaveLength(1);
    expect(layout).toMatch(/<main[^>]*id=\{MAIN_CONTENT_ID\}/);
    expect(MAIN_CONTENT_ID).toBe("main-content");
  });

  it("can receive the focus that the skip link sends to it", () => {
    expect(layout).toMatch(/<main[^>]*tabIndex=\{-1\}/);
  });

  it("renders the skip link before the main area", () => {
    expect(layout).toContain('import { MAIN_CONTENT_ID, SkipLink } from "../components/SkipLink"');
    expect(layout.indexOf("<SkipLink")).toBeGreaterThan(-1);
    expect(layout.indexOf("<SkipLink")).toBeLessThan(layout.indexOf("<main"));
  });

  it("is not declared again by any page or component (no nested main)", () => {
    const declaring = sourceFiles("app")
      .concat(sourceFiles("components"))
      .filter((file) => file !== join("app", "layout.tsx"))
      .filter((file) => /<main\b/.test(readFileSync(file, "utf-8")));

    expect(declaring).toEqual([]);
  });
});

// The header sits between the skip link and the main area, on every page
// (home-redesign RF-1): skip link first, so the first Tab reaches it; header
// next; then the single main area. Read as text, like the rest of this file.
describe("the header in the root layout (RF-1)", () => {
  const at = (needle: string) => layout.indexOf(needle);

  it("renders the skip link, the header and the main area, in that order", () => {
    expect(at("<SkipLink")).toBeGreaterThan(-1);
    expect(at("<SiteHeader")).toBeGreaterThan(-1);
    expect(at("<main")).toBeGreaterThan(-1);

    expect(at("<SkipLink")).toBeLessThan(at("<SiteHeader"));
    expect(at("<SiteHeader")).toBeLessThan(at("<main"));
  });

  it("renders the header once, outside the main area", () => {
    expect(layout.match(/<SiteHeader\b/g)).toHaveLength(1);
    expect(at("<SiteHeader")).toBeLessThan(at("<main"));
    expect(layout.slice(at("<main"))).not.toContain("<SiteHeader");
  });

  it("imports it from the components", () => {
    expect(layout).toMatch(/import \{ SiteHeader \} from "\.\.\/components\/SiteHeader"/);
  });
});
