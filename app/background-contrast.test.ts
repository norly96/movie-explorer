import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// WCAG 2.1 AA over the page background (home-redesign RF-29). Lighthouse cannot
// measure text over a gradient, so the lightest point of the background is
// computed here from the tokens in app/globals.css, and every text color must
// keep its ratio there. The lightest point is what decides: if the darker
// places pass, a lighter one would still be the worst.
const css = readFileSync("app/globals.css", "utf-8");

type Rgb = [number, number, number];

function token(name: string): string {
  const value = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  if (!value) throw new Error(`--color-${name} not found`);
  return value;
}

function percent(name: string): number {
  const value = css.match(new RegExp(`${name}:\\s*(\\d+(?:\\.\\d+)?)%`))?.[1];
  if (!value) throw new Error(`${name} not found`);
  return Number(value) / 100;
}

const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;

// `top` painted over `bottom` with the given opacity.
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

const BACKGROUND = rgb(token("background"));
const SURFACE = rgb(token("surface"));
const FOREGROUND = rgb(token("foreground"));
const ACCENT = rgb(token("accent"));

const GLOW = percent("--glow-opacity");
const HEADER_TINT = percent("--tint-header");
const BAR_TINT = percent("--tint-bar");

// The places the background is lightest, each as the color painted there:
// the top of the gradient (surface), under the header's tint, at the center of
// the glow, and at the center of the glow under the bar's tint (the worst
// combination, even if the two never overlap on the real page).
const GLOW_CENTER = mix(ACCENT, BACKGROUND, GLOW);
const LIGHTEST_POINTS: [string, Rgb][] = [
  ["the top of the gradient", SURFACE],
  ["under the header's tint", mix(FOREGROUND, SURFACE, HEADER_TINT)],
  ["the center of the glow", GLOW_CENTER],
  ["the center of the glow under the bar's tint", mix(FOREGROUND, GLOW_CENTER, BAR_TINT)],
];

const TEXT_COLORS = ["foreground", "muted", "subtle", "accent"] as const;

describe("text over the page background (RF-29)", () => {
  it("keeps the glow subtle enough: it is at most 9%", () => {
    // Higher values were measured: at 30% muted falls to 3.95:1 and subtle to
    // 2.96:1; at 10% subtle still falls to 4.46:1 where the bar's tint overlaps
    // the glow, which can happen on a phone.
    expect(GLOW).toBeLessThanOrEqual(0.09);
  });

  describe.each(LIGHTEST_POINTS)("at %s", (_place, background) => {
    it.each(TEXT_COLORS)("keeps %s at 4.5:1 or more (WCAG 2.1 AA, normal text)", (name) => {
      expect(contrast(rgb(token(name)), background)).toBeGreaterThanOrEqual(4.5);
    });
  });

  it("measures what it claims: the glow center is lighter than the plain page", () => {
    expect(luminance(GLOW_CENTER)).toBeGreaterThan(luminance(BACKGROUND));
  });
});
