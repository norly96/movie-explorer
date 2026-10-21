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
    // The header's narrow first row, and the width below which its brand's text
    // is hidden visually (docs/design.md → SiteHeader).
    ["--size-header-narrow", "3.5rem"],
    ["--breakpoint-xs", "22.5rem"],
    ["--duration-appear", "200ms"],
    ["--duration-curtain", "400ms"],
    ["--scale-card-hover", "1.03"],
  ])("defines %s as %s inside @theme", (token, value) => {
    const declaration = new RegExp(`${token}:\\s*${value.replace(".", "\\.")}\\s*;`);

    expect(themeBlock).toMatch(declaration);
  });
});

// The page background (home-redesign RF-27, RF-28): one fixed layer behind the
// content, built only from the tokens above, plus the faint tints and the hero's
// fade. Read as text, like the token tests: there is no layout engine here.
describe("app/globals.css page background", () => {
  // The declarations of every rule whose selector list includes `selector`,
  // joined (a shared rule and a specific one both apply to the element).
  function ruleBody(selector: string): string {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const bodies: string[] = [];

    for (const [, selectors, body] of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (selectors.split(",").some((part) => part.trim() === selector)) {
        bodies.push(body);
      }
    }
    return bodies.join("\n");
  }

  const layer = ruleBody("body::before");

  it("is one fixed layer behind the content that never takes a click", () => {
    expect(layer).toMatch(/position:\s*fixed/);
    expect(layer).toMatch(/z-index:\s*-1/);
    expect(layer).toMatch(/pointer-events:\s*none/);
  });

  it("is sized to the large viewport, so a phone's browser bar does not make it jump", () => {
    expect(layer).toMatch(/height:\s*100lvh/);
  });

  it("is a gradient from the surface to the page color, from the tokens", () => {
    expect(layer).toContain("linear-gradient");
    expect(layer).toContain("var(--color-surface)");
    expect(layer).toContain("var(--color-background)");
    expect(layer).toContain("var(--page-gradient-height)");
  });

  // The glow is its own fixed layer with an opacity, not a color-mix with a
  // variable percentage: the CSS compiler cannot evaluate that, and writes a
  // fallback without the opacity (a solid amber blob in browsers that need it).
  describe("the glow", () => {
    const glow = ruleBody("body::after");

    it("is a second fixed layer, sized like the first, that never takes a click", () => {
      expect(glow).toMatch(/position:\s*fixed/);
      expect(glow).toMatch(/height:\s*100lvh/);
      expect(glow).toMatch(/z-index:\s*-1/);
      expect(glow).toMatch(/pointer-events:\s*none/);
    });

    it("is an accent ellipse that fades to nothing, at the token's size and place", () => {
      expect(glow).toContain("radial-gradient");
      expect(glow).toContain("var(--color-accent)");
      expect(glow).toContain("var(--glow-size)");
      expect(glow).toContain("var(--glow-y)");
    });

    it("gets its strength from the layer's opacity token", () => {
      expect(glow).toMatch(/opacity:\s*var\(--glow-opacity\)/);
    });
  });

  it("uses no color-mix in these rules: with a variable percentage the compiled CSS loses the opacity", () => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

    expect(withoutComments).not.toMatch(/color-mix\(/);
  });

  it("never uses background-attachment: fixed (it janks on phones and fails on iOS)", () => {
    // Comments may mention it, to say why it is avoided; only declarations count.
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

    expect(withoutComments).not.toMatch(/background-attachment/);
  });

  it.each([
    ["--page-gradient-height", "540px"],
    ["--glow-opacity", "9%"],
    ["--glow-size", "340px 260px"],
    ["--glow-y", "640px"],
    ["--tint-header", "5%"],
    ["--tint-bar", "4%"],
  ])("defines %s as %s for narrow screens", (token, value) => {
    expect(css).toMatch(new RegExp(`${token}:\\s*${value}\\s*;`));
  });

  it("changes the gradient height, the glow's size and its position on wide screens", () => {
    const wide = css.match(/@media \(min-width: 64rem\)\s*\{([\s\S]*?)\n  \}/)?.[1] ?? "";

    expect(wide).toMatch(/--page-gradient-height:\s*520px/);
    expect(wide).toMatch(/--glow-size:\s*760px 300px/);
    expect(wide).toMatch(/--glow-y:\s*620px/);
  });

  it("defines the header's and the bar's faint tints, with no divider border", () => {
    // Each tint is a gradient on a pseudo-element whose opacity is the token, so
    // the section's own content is never faded.
    const header = ruleBody(".header-tint::before");
    const bar = ruleBody(".bar-tint::before");

    expect(header).toMatch(/opacity:\s*var\(--tint-header\)/);
    expect(bar).toMatch(/opacity:\s*var\(--tint-bar\)/);
    expect(header).toContain("var(--color-foreground)");
    expect(bar).toContain("var(--color-foreground)");
    expect(header).not.toMatch(/border/);
    expect(bar).not.toMatch(/border/);
    expect(ruleBody(".header-tint")).not.toMatch(/border/);
    expect(ruleBody(".bar-tint")).not.toMatch(/border/);
  });

  it("defines the hero's vertical fade, with the narrow and the wide stops", () => {
    const fade = ruleBody(".hero-fade");

    expect(fade).toMatch(/mask-image:\s*linear-gradient\(\s*180deg[^;]*14%[^;]*45%/);
    expect(fade).toMatch(/-webkit-mask-image/);
    expect(css).toMatch(/\.hero-fade\s*\{[^}]*18%[^}]*50%/);
  });

  it("uses no literal color in any of these rules", () => {
    const rules = [
      layer,
      ruleBody("body::after"),
      ruleBody(".header-tint"),
      ruleBody(".header-tint::before"),
      ruleBody(".bar-tint"),
      ruleBody(".bar-tint::before"),
      ruleBody(".hero-fade"),
    ].join("\n");

    expect(rules).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(rules).not.toMatch(/\b(?:rgb|rgba|hsl|hsla)\(/);
  });
});

describe("home-redesign: the room of Clear filters (RF-19)", () => {
  it("defines --size-clear-filters as the 132px width of the button on wide screens", () => {
    expect(css).toMatch(/--size-clear-filters:\s*8\.25rem;/);
  });
});

describe("home-redesign: the widths of the search and filters bar (RF-18)", () => {
  it.each([
    ["--size-search", "26.25rem"],
    ["--size-genre", "11.875rem"],
    ["--size-year", "8.125rem"],
    ["--size-sort", "13.125rem"],
  ])("defines %s as %s", (token, value) => {
    expect(css).toContain(`${token}: ${value};`);
  });
});

describe("home-redesign: where the back-to-top button appears (RF-24)", () => {
  it("defines --offset-back-to-top as 300px", () => {
    expect(css).toContain("--offset-back-to-top: 18.75rem;");
  });
});

describe("home-redesign: the duration of the card's hover (RF-23)", () => {
  it("defines --duration-fast as 150ms, as design.md documents", () => {
    expect(css).toContain("--duration-fast: 150ms;");
  });
});
