import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RatingBadge } from "./RatingBadge";

describe("RatingBadge", () => {
  it("renders a numeric rating with one decimal and an a11y label (RF-1)", () => {
    render(<RatingBadge rating={7.8} />);
    expect(screen.getByText("7.8")).toBeInTheDocument();
    expect(screen.getByLabelText("Rated 7.8 out of 10")).toBeInTheDocument();
  });

  it("formats an integer rating with one decimal", () => {
    render(<RatingBadge rating={8} />);
    expect(screen.getByText("8.0")).toBeInTheDocument();
  });

  it("renders 'No rating' when rating is null", () => {
    render(<RatingBadge rating={null} />);
    expect(screen.getByText("No rating")).toBeInTheDocument();
  });
});

// docs/design.md → RatingBadge: a 16px star filled with the accent color next
// to the score; the star is decorative, the label carries the meaning (RF-35).
describe("RatingBadge star (RF-35)", () => {
  it("shows a decorative, filled 16px star next to the number", () => {
    const { container } = render(<RatingBadge rating={7.8} />);
    const star = container.querySelector("svg");

    expect(star).not.toBeNull();
    expect(star).toHaveAttribute("aria-hidden", "true");
    expect(star).toHaveAttribute("width", "16");
    expect(star).toHaveAttribute("height", "16");
    expect(star).toHaveAttribute("fill", "currentColor");
  });

  it("keeps the accessible label on the element that holds the star and the number", () => {
    render(<RatingBadge rating={7.8} />);
    const badge = screen.getByLabelText("Rated 7.8 out of 10");

    expect(badge.querySelector("svg")).not.toBeNull();
    expect(badge).toHaveTextContent("7.8");
  });

  it("draws the star in the accent color (it inherits the badge's)", () => {
    render(<RatingBadge rating={7.8} />);

    expect(screen.getByLabelText("Rated 7.8 out of 10")).toHaveClass("text-accent");
  });

  it("shows no star for an unrated movie", () => {
    const { container } = render(<RatingBadge rating={null} />);

    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getByText("No rating")).toBeInTheDocument();
  });
});
