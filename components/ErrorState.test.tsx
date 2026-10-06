import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  it("renders the default message and a Try again action (RF-5)", () => {
    render(<ErrorState />);
    expect(
      screen.getByText(/couldn't load popular movies/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /try again/i })
    ).toBeInTheDocument();
  });

  it("renders a custom message when provided", () => {
    render(<ErrorState message="Something else went wrong." />);
    expect(screen.getByText("Something else went wrong.")).toBeInTheDocument();
  });

  it("defaults the Try again action to / (RF-10)", () => {
    render(<ErrorState />);
    expect(screen.getByRole("link", { name: /try again/i })).toHaveAttribute(
      "href",
      "/"
    );
  });

  it("points Try again at a custom retryHref when provided (RF-10)", () => {
    render(<ErrorState retryHref="/movie/42" />);
    expect(screen.getByRole("link", { name: /try again/i })).toHaveAttribute(
      "href",
      "/movie/42"
    );
  });
});
