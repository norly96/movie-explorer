import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MovieCardSkeleton } from "./MovieCardSkeleton";

describe("MovieCardSkeleton", () => {
  it("renders placeholder blocks for poster, title and metadata (RF-6)", () => {
    const { container } = render(<MovieCardSkeleton />);
    const placeholders = container.querySelectorAll(".animate-pulse");

    // One block per piece of MovieCard's structure: poster, title, metadata.
    expect(placeholders).toHaveLength(3);
  });

  it("is hidden from assistive tech (purely decorative while loading)", () => {
    const { container } = render(<MovieCardSkeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

// docs/design.md: with reduced motion the pulse is switched off entirely, not
// merely shortened (the global reduced-motion rule only shortens durations, and
// an infinite animation would keep repeating). Home redesign RF-36.
describe("MovieCardSkeleton under reduced motion (RF-36)", () => {
  it("switches off the pulse of every pulsing block", () => {
    const { container } = render(<MovieCardSkeleton />);
    const pulsing = container.querySelectorAll(".animate-pulse");

    expect(pulsing).toHaveLength(3);
    for (const block of pulsing) {
      expect(block).toHaveClass("motion-reduce:animate-none");
    }
  });
});
