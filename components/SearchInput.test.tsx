import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchInput } from "./SearchInput";

describe("SearchInput", () => {
  it("renders a visible label associated with the input (RF-18, design.md)", () => {
    render(<SearchInput value="" onChange={() => {}} />);

    const input = screen.getByLabelText("Search movies");
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
    // A visible <label>, not just an aria-label.
    expect(screen.getByText("Search movies").tagName).toBe("LABEL");
  });

  it("shows the controlled value", () => {
    render(<SearchInput value="matrix" onChange={() => {}} />);

    expect(screen.getByLabelText("Search movies")).toHaveValue("matrix");
  });

  it("calls onChange on every keystroke, undebounced (RF-6)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);

    await user.type(screen.getByLabelText("Search movies"), "abc");

    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenNthCalledWith(1, "a");
    expect(onChange).toHaveBeenNthCalledWith(2, "b");
    expect(onChange).toHaveBeenNthCalledWith(3, "c");
  });

  it("renders a decorative SearchIcon hidden from assistive tech", () => {
    const { container } = render(<SearchInput value="" onChange={() => {}} />);

    const icon = container.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("is reachable with the keyboard (RF-18)", async () => {
    const user = userEvent.setup();
    render(<SearchInput value="" onChange={() => {}} />);

    await user.tab();

    expect(screen.getByLabelText("Search movies")).toHaveFocus();
  });
});

// home-redesign RF-13, RF-18, RF-20: in the redesigned bar the label is visually
// hidden but stays a real <label> that names the field; the field can be reached
// through a reference (so the hero can send focus to it); its height follows the
// control sizes and its text is 16px.
describe("SearchInput in the redesigned bar", () => {
  it("hides the label visually and still names the field with it (RF-18)", () => {
    render(<SearchInput value="" onChange={() => {}} />);

    const label = screen.getByText("Search movies");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveClass("sr-only");
    expect(screen.getByLabelText("Search movies").tagName).toBe("INPUT");
    expect(screen.getByRole("textbox", { name: "Search movies" })).toBeInTheDocument();
  });

  it("gives the reference it receives the input element (RF-13)", () => {
    const inputRef = createRef<HTMLInputElement>();
    render(<SearchInput value="" onChange={() => {}} inputRef={inputRef} />);

    expect(inputRef.current).toBe(screen.getByLabelText("Search movies"));
  });

  it("lets the owner of the reference move focus to the field (RF-13)", () => {
    const inputRef = createRef<HTMLInputElement>();
    render(<SearchInput value="" onChange={() => {}} inputRef={inputRef} />);

    inputRef.current?.focus();

    expect(screen.getByLabelText("Search movies")).toHaveFocus();
  });

  it("is 48px high on phones, 44px from lg, with 16px text (RF-20)", () => {
    render(<SearchInput value="" onChange={() => {}} />);

    const input = screen.getByLabelText("Search movies");
    expect(input).toHaveClass("h-(--size-control-touch)");
    expect(input).toHaveClass("lg:h-(--size-control)");
    expect(input).toHaveClass("text-base");
  });
});
