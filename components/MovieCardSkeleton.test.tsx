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
