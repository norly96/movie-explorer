import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The README carries the same TMDB attribution as the About page (home-redesign
// RF-31): the notice that TMDB's API terms of use require, word for word, and
// TMDB's logo, small and unmodified. Read as text, like the other root-level
// checks of repository files.
const NOTICE =
  "This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.";

const readme = readFileSync("README.md", "utf-8");

describe("README TMDB attribution (RF-31)", () => {
  it("has the notice that TMDB requires, word for word", () => {
    expect(readme).toContain(NOTICE);
  });

  it("shows TMDB's logo, from the file the About page uses", () => {
    expect(readme).toMatch(/<img[^>]*src="public\/tmdb-logo\.svg"/);
    expect(existsSync("public/tmdb-logo.svg")).toBe(true);
  });

  it("gives the logo a text alternative and keeps it small, like on the About page", () => {
    const logo = readme.match(/<img[^>]*src="public\/tmdb-logo\.svg"[^>]*>/)?.[0] ?? "";

    expect(logo).toContain('alt="TMDB"');
    expect(logo).toContain('height="24"');
  });

  it("has them under a heading of their own", () => {
    expect(readme).toMatch(/^## TMDB attribution\s*$/m);
  });

  it("does not use the older wording of the notice", () => {
    expect(readme).not.toContain("This product uses the TMDB API");
  });
});
