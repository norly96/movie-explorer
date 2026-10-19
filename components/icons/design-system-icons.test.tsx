import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AlertIcon } from "./AlertIcon";
import { FilmIcon } from "./FilmIcon";
import { StarIcon } from "./StarIcon";

// docs/design.md → Icons: one component per icon, 24 × 24 grid, stroke 1.5
// with rounded caps and joins, color inherited, decorative by default.
const ICONS = [
  ["StarIcon", StarIcon],
  ["AlertIcon", AlertIcon],
  ["FilmIcon", FilmIcon],
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

// The rating shows a star filled with the accent color (design.md →
// RatingBadge); every other use is an outline.
describe("StarIcon filled", () => {
  it("is an outline unless asked to be filled", () => {
    expect(svgOf(<StarIcon />)).toHaveAttribute("fill", "none");
  });

  it("fills with the current color when filled", () => {
    expect(svgOf(<StarIcon filled />)).toHaveAttribute("fill", "currentColor");
  });
});
