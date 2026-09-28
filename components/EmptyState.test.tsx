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
