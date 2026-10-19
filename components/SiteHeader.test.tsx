import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SiteConfig } from "../app/site-config";

// HeaderNav reads the pathname; nothing else of the router is used here.
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const { SiteHeader } = await import("./SiteHeader");

const FULL: SiteConfig = {
  name: "Movie-explorer",
  links: {
    site: "https://example.dev",
    linkedin: "https://www.linkedin.com/in/example",
    github: "https://github.com/example",
  },
};
const EMPTY: SiteConfig = {
  name: "Movie-explorer",
  links: { site: "", linkedin: "", github: "" },
};

// The header renders two layouts of the same content and CSS shows one, so that
// the keyboard order equals the visual order at every width (home-redesign
// RF-4). In a test there is no CSS: both are in the document, told apart by
// data-variant.
function variant(name: "wide" | "narrow") {
  const element = document.querySelector(`[data-variant="${name}"]`);
  if (!(element instanceof HTMLElement)) throw new Error(`no ${name} variant`);
  return within(element);
}

function variantElement(name: "wide" | "narrow") {
  return document.querySelector(`[data-variant="${name}"]`) as HTMLElement;
}

describe.each(["wide", "narrow"] as const)("SiteHeader, %s layout (RF-1, RF-3)", (name) => {
  it("has the brand, linking to the home, with an accessible name", () => {
    render(<SiteHeader config={FULL} />);

    const brand = variant(name).getByRole("link", { name: "Movie-explorer, home" });
    expect(brand).toHaveAttribute("href", "/");
  });

  it('has the "Home" and "About" links', () => {
    render(<SiteHeader config={FULL} />);

    expect(variant(name).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(variant(name).getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
  });

  it("has the three external links, in a new tab, and says so in their name", () => {
    render(<SiteHeader config={FULL} />);

    for (const [label, href] of [
      ["Author's site", "https://example.dev"],
      ["LinkedIn", "https://www.linkedin.com/in/example"],
      ["GitHub", "https://github.com/example"],
    ]) {
      const link = variant(name).getByRole("link", {
        name: `${label} (opens in a new tab)`,
      });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
  });

  it("gives each external link a decorative icon", () => {
    render(<SiteHeader config={FULL} />);

    const link = variant(name).getByRole("link", { name: "GitHub (opens in a new tab)" });
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows only the external links whose address is complete https", () => {
    render(
      <SiteHeader
        config={{
          ...FULL,
          links: { site: "", linkedin: "javascript:alert(1)", github: "https://github.com/example" },
        }}
      />
    );

    const links = variantElement(name).querySelectorAll('a[target="_blank"]');
    expect([...links].map((link) => link.getAttribute("aria-label"))).toEqual([
      "GitHub (opens in a new tab)",
    ]);
  });

  it("shows no external link at all while every address is empty", () => {
    render(<SiteHeader config={EMPTY} />);

    expect(variantElement(name).querySelectorAll('a[target="_blank"]')).toHaveLength(0);
    expect(variant(name).getByRole("link", { name: "Home" })).toBeInTheDocument();
  });

  it("keeps the brand's name when its text is hidden visually", () => {
    render(<SiteHeader config={FULL} />);

    const brand = variant(name).getByRole("link", { name: "Movie-explorer, home" });
    const text = within(brand).getByText("Movie-explorer");
    // Visually hidden at the smallest widths, still read by assistive technology.
    expect(text).toHaveClass("sr-only", "xs:not-sr-only");
    expect(brand.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("SiteHeader order and layouts (RF-4)", () => {
  const FOLLOWS = Node.DOCUMENT_POSITION_FOLLOWING;

  function positions(name: "wide" | "narrow") {
    const root = variantElement(name);
    return {
      brand: root.querySelector('a[aria-label="Movie-explorer, home"]') as Element,
      nav: root.querySelector("nav") as Element,
      icons: root.querySelector('a[target="_blank"]') as Element,
    };
  }

  it("wide: the keyboard order is brand, then Home and About, then the external links", () => {
    render(<SiteHeader config={FULL} />);
    const { brand, nav, icons } = positions("wide");

    expect(brand.compareDocumentPosition(nav) & FOLLOWS).toBeTruthy();
    expect(nav.compareDocumentPosition(icons) & FOLLOWS).toBeTruthy();
  });

  it("narrow: the keyboard order is brand, then the external links, then Home and About", () => {
    render(<SiteHeader config={FULL} />);
    const { brand, nav, icons } = positions("narrow");

    expect(brand.compareDocumentPosition(icons) & FOLLOWS).toBeTruthy();
    expect(icons.compareDocumentPosition(nav) & FOLLOWS).toBeTruthy();
  });

  it("shows the wide layout from lg and the narrow one below it, never both", () => {
    render(<SiteHeader config={FULL} />);

    expect(variantElement("wide")).toHaveClass("hidden", "lg:block");
    expect(variantElement("narrow")).toHaveClass("lg:hidden");
    expect(variantElement("narrow")).not.toHaveClass("hidden");
  });

  it("has one banner landmark, scrolls away with the page and draws no border", () => {
    render(<SiteHeader config={FULL} />);

    const header = screen.getByRole("banner");
    expect(header).toHaveClass("header-tint");
    expect(header.className).not.toMatch(/\bfixed\b|\bsticky\b/);
    expect(header.className).not.toMatch(/border/);
  });

  it("labels each of the two navigations, of which only one is ever shown", () => {
    render(<SiteHeader config={FULL} />);

    expect(variantElement("wide").querySelector('nav[aria-label="Main"]')).not.toBeNull();
    expect(variantElement("narrow").querySelector('nav[aria-label="Main"]')).not.toBeNull();
  });
});
