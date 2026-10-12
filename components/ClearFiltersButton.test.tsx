import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ClearFiltersButton } from "./ClearFiltersButton";

describe("ClearFiltersButton", () => {
  it("renders nothing when visible is false (RF-17)", () => {
    const { container } = render(
      <ClearFiltersButton visible={false} onClear={() => {}} />
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a button when visible is true (RF-17)", () => {
    render(<ClearFiltersButton visible={true} onClear={() => {}} />);

    expect(
      screen.getByRole("button", { name: "Clear filters" })
    ).toBeInTheDocument();
  });

  it("calls onClear when clicked (RF-17)", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<ClearFiltersButton visible={true} onClear={onClear} />);

    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("is operable with the keyboard (RF-18)", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<ClearFiltersButton visible={true} onClear={onClear} />);

    await user.tab();
    expect(screen.getByRole("button", { name: "Clear filters" })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("does not call onClear on render", () => {
    const onClear = vi.fn();
    render(<ClearFiltersButton visible={true} onClear={onClear} />);

    expect(onClear).not.toHaveBeenCalled();
  });
});
