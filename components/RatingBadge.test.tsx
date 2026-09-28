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
