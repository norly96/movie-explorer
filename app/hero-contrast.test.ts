import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// WCAG 2.1 AA over the featured hero's image (home-redesign RF-17, RF-29). The
// hero's text sits over a photograph nobody controls, so the dark layer from the
// left is what keeps it readable. The worst photograph is a pure white one: if
// the text passes over white, it passes over any image. The layer is composed
// over white from the stops in app/globals.css, at the places the text can be at
// 1280, 1440 and 1920 px.
//
// Wide layout: the image spans the page's width, and the text column (at most
// 520 px wide) starts at the left edge of the 1280 px content area plus its 32 px
// side padding. Narrow layouts put the text below the image, on the page
// background, so they need no layer.
const css = readFileSync("app/globals.css", "utf-8");

type Rgb = [number, number, number];

const rgb = (hex: string): Rgb =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;

function token(name: string): Rgb {
  const value = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  if (!value) throw new Error(`--color-${name} not found`);
  return rgb(value);
}

const mix = (top: Rgb, bottom: Rgb, opacity: number): Rgb =>
  top.map((channel, i) => channel * opacity + bottom[i] * (1 - opacity)) as Rgb;

function luminance([r, g, b]: Rgb): number {
  const linear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

const BACKGROUND = token("background");
const WHITE: Rgb = [255, 255, 255];

// The stops of the dark layer, read from the `.hero-scrim` rule's mask: a
// position in percent and the opacity of the page color there.
interface Stop {
  position: number;
  opacity: number;
}

function scrimStops(): Stop[] {
  const gradient = css.match(
    /(?<!-webkit-)mask-image:\s*linear-gradient\(([^;]*)\);/
  )?.[1];
  const rule = css.match(/\.hero-scrim\s*\{([^}]*)\}/)?.[1];
  if (!rule || !gradient || !rule.includes(gradient)) {
    throw new Error(".hero-scrim mask not found");
  }
  const stop =
    /(black|rgb\(0 0 0 \/ (\d+(?:\.\d+)?)%\)|transparent) (\d+(?:\.\d+)?)%/g;
  return [...gradient.matchAll(stop)].map(([, color, opacity, position]) => ({
    position: Number(position) / 100,
    opacity:
      color === "transparent" ? 0 : color === "black" ? 1 : Number(opacity) / 100,
  }));
}

function opacityAt(stops: Stop[], position: number): number {
  for (let i = 1; i < stops.length; i++) {
    const [from, to] = [stops[i - 1], stops[i]];
    if (position <= to.position) {
      const t = (position - from.position) / (to.position - from.position);
      return from.opacity + (to.opacity - from.opacity) * t;
    }
  }
  return stops[stops.length - 1].opacity;
}

const CONTENT_WIDTH = 1280;
const SIDE_PADDING = 32;
const TEXT_COLUMN = 520;
const STEP = 4;

// The image under the text at the lightest place: a pure white image, with the
// dark layer over it.
function textRange(width: number): [number, number] {
  const left = Math.max(0, (width - CONTENT_WIDTH) / 2) + SIDE_PADDING;
  return [left, left + TEXT_COLUMN];
}

function worstBackground(width: number): { color: Rgb; at: number } {
  const stops = scrimStops();
  const [from, to] = textRange(width);
  let worst = { color: BACKGROUND, at: from };
  let worstLuminance = -1;
  for (let x = from; x <= to; x += STEP) {
    const color = mix(BACKGROUND, WHITE, opacityAt(stops, x / width));
    if (luminance(color) > worstLuminance) {
      worstLuminance = luminance(color);
      worst = { color, at: x };
    }
  }
  return worst;
}

const TEXT: [string, Rgb, number][] = [
  ["the title (foreground, large text)", token("foreground"), 3],
  ["the synopsis (foreground)", token("foreground"), 4.5],
  ["the data line (muted)", token("muted"), 4.5],
  ["the rating (accent)", token("accent"), 4.5],
];

describe("the hero's dark layer (RF-17, RF-29)", () => {
  it("reads its stops from the .hero-scrim rule, from the page color to nothing", () => {
    const stops = scrimStops();

    expect(stops.length).toBeGreaterThanOrEqual(4);
    expect(stops[0]).toEqual({ position: 0, opacity: 1 });
    expect(stops[stops.length - 1]).toEqual({ position: 1, opacity: 0 });
    const positions = stops.map((s) => s.position);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("never gets lighter as it moves right, so the worst place is the end of the text", () => {
    const stops = scrimStops();

    const opacities = stops.map((s) => s.opacity);
    expect(opacities).toEqual([...opacities].sort((a, b) => b - a));
  });

  it("is the page color, drawn through a mask, with no color-mix (the compiler loses its opacity)", () => {
    const rule = css.match(/\.hero-scrim\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(rule).toMatch(/background:\s*var\(--color-background\)/);
    expect(rule).not.toMatch(/color-mix\(/);
  });

  describe.each([1280, 1440, 1920])("at %i px wide", (width) => {
    it.each(TEXT)("keeps %s readable over a pure white image", (_name, color, ratio) => {
      const { color: background, at } = worstBackground(width);

      expect(
        contrast(color, background),
        `at x=${at} the background is rgb(${background.map(Math.round)})`
      ).toBeGreaterThanOrEqual(ratio);
    });
  });
});
