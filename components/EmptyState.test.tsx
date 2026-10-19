import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the default message when none is provided (RF-4)", () => {
    render(<EmptyState />);
    expect(screen.getByText("No movies found")).toBeInTheDocument();
  });

  it("renders a custom message when provided", () => {
    render(<EmptyState message='No movies match "zzz"' />);
    expect(screen.getByText('No movies match "zzz"')).toBeInTheDocument();
  });
});

// docs/design.md → EmptyState: a FilmIcon 24px in subtle above the message. It
// is decorative: the message already says why nothing is shown (RF-35).
describe("EmptyState icon (RF-35)", () => {
  it("shows a decorative 24px film icon in the subtle color", () => {
    render(<EmptyState />);
    const icon = screen.getByRole("status").querySelector("svg");

    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveAttribute("width", "24");
    expect(icon).toHaveClass("text-subtle");
  });

  it("comes before the message and keeps the status role and the text", () => {
    render(<EmptyState message="No movies match “zzz”." />);
    const status = screen.getByRole("status");

    expect(status.firstElementChild?.tagName.toLowerCase()).toBe("svg");
    expect(status).toHaveTextContent("No movies match “zzz”.");
  });
});
