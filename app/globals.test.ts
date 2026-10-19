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

// Tokens added by the home redesign (docs/design.md, approved in T01). They
// must live in the plain `@theme` block, where Tailwind turns them into theme
// variables; `@theme inline` holds only the font stack.
describe("app/globals.css home redesign tokens", () => {
  const themeBlock = css.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  it("has a plain @theme block to look in", () => {
    expect(themeBlock).toContain("--color-background");
  });

  it.each([
    // Type: the featured hero's title, wide and narrow.
    ["--text-hero", "2.5rem"],
    ["--text-hero--line-height", "3rem"],
    ["--text-hero-sm", "1.75rem"],
    ["--text-hero-sm--line-height", "2.25rem"],
    // Named sizes outside the 4px steps.
    ["--size-control", "2.75rem"],
    ["--size-control-touch", "3rem"],
    ["--size-icon-button", "2.75rem"],
    ["--size-brand-icon", "1.75rem"],
    ["--size-header", "4rem"],
    ["--size-hero", "20rem"],
    ["--size-back-to-top", "3rem"],
    // Durations of the two new transitions, and the card's enlargement.
    ["--duration-appear", "200ms"],
    ["--duration-curtain", "400ms"],
    ["--scale-card-hover", "1.03"],
  ])("defines %s as %s inside @theme", (token, value) => {
    const declaration = new RegExp(`${token}:\\s*${value.replace(".", "\\.")}\\s*;`);

    expect(themeBlock).toMatch(declaration);
  });
});
