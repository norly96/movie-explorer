import { render, screen } from "@testing-library/react";
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
