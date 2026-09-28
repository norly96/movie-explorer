import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf-8");

// design.md is the single source of truth for visual tokens (AGENTS.md
// Hard rules: "Only use tokens from design.md. No hardcoded colors or
// sizes."). This asserts the token set components rely on actually
// exists, rather than relying on visual inspection.
describe("app/globals.css design tokens", () => {
  it.each([
    "--color-background",
    "--color-surface",
    "--color-surface-raised",
    "--color-border",
    "--color-border-strong",
    "--color-foreground",
    "--color-muted",
    "--color-subtle",
    "--color-accent",
    "--color-accent-hover",
    "--color-accent-foreground",
    "--color-danger",
    "--radius-sm",
    "--radius-md",
    "--aspect-poster",
  ])("defines the %s token", (token) => {
    expect(css).toContain(token);
  });

  it("resets Tailwind's default color palette (token-only colors)", () => {
    expect(css).toContain("--color-*: initial");
  });

  it("sets a dark color-scheme with a visible focus outline", () => {
    expect(css).toMatch(/color-scheme:\s*dark/);
    expect(css).toContain(":focus-visible");
  });

  it("disables animations under prefers-reduced-motion", () => {
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
});
