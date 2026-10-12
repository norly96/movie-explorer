import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InlinePageError } from "./InlinePageError";

describe("InlinePageError", () => {
  it("renders an inline error message (RF-15)", () => {
    render(<InlinePageError onRetry={() => {}} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn't load more movies. Check your connection and try again."
    );
  });

  it("renders a Try again button (RF-15)", () => {
    render(<InlinePageError onRetry={() => {}} />);

    expect(
      screen.getByRole("button", { name: "Try again" })
    ).toBeInTheDocument();
  });

  it("calls onRetry when Try again is clicked (RF-22)", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<InlinePageError onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("is operable with the keyboard (RF-18)", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<InlinePageError onRetry={onRetry} />);

    await user.tab();
    expect(screen.getByRole("button", { name: "Try again" })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
