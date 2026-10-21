import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResultsAnnouncer } from "./ResultsAnnouncer";

// home-redesign RF-22: a visually hidden polite live region that carries the
// results heading's text once a search or filter selection has loaded.
describe("ResultsAnnouncer", () => {
  it("carries the given text", () => {
    render(<ResultsAnnouncer text="Drama · 1999" />);

    expect(screen.getByText("Drama · 1999")).toBeInTheDocument();
  });

  it("is a polite live region, so it never interrupts the visitor", () => {
    render(<ResultsAnnouncer text="Results for “matrix”" />);

    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveTextContent("Results for “matrix”");
  });

  it("is read as a whole, not in pieces", () => {
    render(<ResultsAnnouncer text="Drama · 1999" />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "true");
  });

  it("is visually hidden", () => {
    render(<ResultsAnnouncer text="Drama · 1999" />);

    expect(screen.getByRole("status")).toHaveClass("sr-only");
  });

  it("takes no focus and is not in the tab order", () => {
    render(<ResultsAnnouncer text="Drama · 1999" />);

    expect(screen.getByRole("status")).not.toHaveAttribute("tabindex");
  });

  it("renders nothing for an empty text", () => {
    const { container } = render(<ResultsAnnouncer text="" />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
