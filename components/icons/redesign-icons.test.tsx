import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArrowRightIcon } from "./ArrowRightIcon";
import { ArrowUpIcon } from "./ArrowUpIcon";
import { ChevronDownIcon } from "./ChevronDownIcon";
import { ClapperboardIcon } from "./ClapperboardIcon";

// Icons added by the home redesign (docs/design.md → Icons). Same rules as the
// rest: one component per icon, 24 × 24 grid, stroke 1.5 with rounded caps and
// joins, color inherited, decorative by default. Their drawings come from the
// approved design canvas.
const ICONS = [
  ["ArrowUpIcon", ArrowUpIcon],
  ["ArrowRightIcon", ArrowRightIcon],
  ["ChevronDownIcon", ChevronDownIcon],
  ["ClapperboardIcon", ClapperboardIcon],
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

  it("is decorative: hidden from assistive technology", () => {
    expect(svgOf(<Icon />)).toHaveAttribute("aria-hidden", "true");
  });

  it("is 20 px by default", () => {
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
    expect(svgOf(<Icon className="text-accent" />)).toHaveClass("text-accent");
  });

  it("draws something", () => {
    expect(svgOf(<Icon />).children.length).toBeGreaterThan(0);
  });
});

// The header's logo is 28px (design.md → Named sizes), outside the three
// standard sizes, so the clapperboard also accepts it.
describe("ClapperboardIcon logo size", () => {
  it("accepts the 28px logo size of the header", () => {
    const svg = svgOf(<ClapperboardIcon size={28} />);

    expect(svg).toHaveAttribute("width", "28");
    expect(svg).toHaveAttribute("height", "28");
  });
});
