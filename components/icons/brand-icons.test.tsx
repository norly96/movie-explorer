import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthorLogoIcon } from "./AuthorLogoIcon";
import { GitHubIcon } from "./GitHubIcon";
import { LinkedInIcon } from "./LinkedInIcon";

// The header's three external-link icons (home-redesign RF-3). Same drawing
// rules as every icon (docs/design.md → Icons). Their drawings are the design
// canvas's stand-ins: the maintainer replaces the files with their own marks
// (task T28), and these rules keep holding for whatever replaces them.
const ICONS = [
  ["AuthorLogoIcon", AuthorLogoIcon],
  ["LinkedInIcon", LinkedInIcon],
  ["GitHubIcon", GitHubIcon],
] as const;

function svgOf(element: React.ReactElement) {
  const { container } = render(element);
  const svg = container.querySelector("svg");
  if (!svg) throw new Error("no svg rendered");
  return svg;
}

describe.each(ICONS)("%s", (_name, Icon) => {
  it("follows the design system's drawing rules", () => {
    const svg = svgOf(<Icon />);

    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).toHaveAttribute("fill", "none");
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg).toHaveAttribute("stroke-width", "1.5");
    expect(svg).toHaveAttribute("stroke-linecap", "round");
    expect(svg).toHaveAttribute("stroke-linejoin", "round");
  });

  it("is decorative: the link around it carries the accessible name", () => {
    expect(svgOf(<Icon />)).toHaveAttribute("aria-hidden", "true");
  });

  it("is 20 px by default, as in the header's 44px buttons", () => {
    const svg = svgOf(<Icon />);

    expect(svg).toHaveAttribute("width", "20");
    expect(svg).toHaveAttribute("height", "20");
  });

  it.each([16, 20, 24] as const)("accepts the size %i", (size) => {
    const svg = svgOf(<Icon size={size} />);

    expect(svg).toHaveAttribute("width", String(size));
    expect(svg).toHaveAttribute("height", String(size));
  });

  it("passes a className through", () => {
    expect(svgOf(<Icon className="text-muted" />)).toHaveClass("text-muted");
  });

  it("draws something", () => {
    expect(svgOf(<Icon />).children.length).toBeGreaterThan(0);
  });
});
