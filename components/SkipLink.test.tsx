import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MAIN_CONTENT_ID, SkipLink } from "./SkipLink";

// A "Skip to content" link, the first focusable element of every page
// (home-redesign RF-5, WCAG 2.4.1): keyboard users jump over the header.
describe("SkipLink (RF-5)", () => {
  it('is a link "Skip to content" pointing at the main area', () => {
    render(<SkipLink />);

    const link = screen.getByRole("link", { name: "Skip to content" });
    expect(link).toHaveAttribute("href", `#${MAIN_CONTENT_ID}`);
  });

  it("is visually hidden until it receives focus", () => {
    render(<SkipLink />);

    const link = screen.getByRole("link", { name: "Skip to content" });
    expect(link).toHaveClass("sr-only");
    expect(link).toHaveClass("focus:not-sr-only");
  });

  it("is the first focusable element when it comes before the other content", async () => {
    const user = userEvent.setup();
    render(
      <>
        <SkipLink />
        <a href="#elsewhere">Elsewhere</a>
        <button type="button">Other</button>
      </>
    );

    await user.tab();

    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveFocus();
  });

  it("is not read as part of the page's content twice: one link, no icon", () => {
    const { container } = render(<SkipLink />);

    expect(container.querySelectorAll("a")).toHaveLength(1);
    expect(container.querySelector("svg")).toBeNull();
  });
});
