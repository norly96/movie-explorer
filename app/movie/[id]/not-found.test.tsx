import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("Movie not-found page", () => {
  it("renders a 'Movie not found' message (RF-9)", () => {
    render(<NotFound />);
    expect(screen.getByText("Movie not found")).toBeInTheDocument();
  });

  it("offers a way back to the home page", () => {
    render(<NotFound />);
    expect(screen.getByRole("link", { name: /home/i })).toHaveAttribute(
      "href",
      "/"
    );
  });
});
