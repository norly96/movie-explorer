import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MovieDetailSkeleton } from "./MovieDetailSkeleton";

describe("MovieDetailSkeleton", () => {
  it("is hidden from assistive tech (purely decorative while loading)", () => {
    const { container } = render(<MovieDetailSkeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("renders placeholder blocks for hero, cast, trailer and gallery (RF-11)", () => {
    const { container } = render(<MovieDetailSkeleton />);
    // hero (backdrop + title + meta line) + cast row (6) + trailer + gallery (3)
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(13);
  });
});
