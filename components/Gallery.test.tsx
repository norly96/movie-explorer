import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Gallery } from "./Gallery";

const URLS = [
  "https://image.tmdb.org/t/p/w500/a.jpg",
  "https://image.tmdb.org/t/p/w500/b.jpg",
  "https://image.tmdb.org/t/p/w500/c.jpg",
];

describe("Gallery", () => {
  it("renders one image per URL given (RF-5)", () => {
    render(<Gallery imageUrls={URLS} />);
    expect(screen.getAllByRole("img")).toHaveLength(3);
  });

  it("renders images via next/image, not a plain <img> (constitution §8)", () => {
    render(<Gallery imageUrls={URLS} />);
    for (const img of screen.getAllByRole("img")) {
      expect(img).toHaveAttribute("data-nimg");
    }
  });

  it("renders nothing when the array is empty (RF-6)", () => {
    const { container } = render(<Gallery imageUrls={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
