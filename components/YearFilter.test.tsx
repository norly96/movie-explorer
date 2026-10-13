import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { YearFilter } from "./YearFilter";

const MAX_YEAR = new Date().getFullYear() + 1;
const MIN_YEAR = 1900;

function yearOptions() {
  return screen
    .getAllByRole("option")
    .filter((option) => option.getAttribute("value") !== "");
}

describe("YearFilter", () => {
  it("renders a labelled <select> (RF-3)", () => {
    render(<YearFilter value={null} onChange={() => {}} />);

    const select = screen.getByLabelText("Year");
    expect(select.tagName).toBe("SELECT");
  });

  it("lists years from next year down to 1900, newest first (RF-3, RF-10)", () => {
    render(<YearFilter value={null} onChange={() => {}} />);

    const years = yearOptions().map((option) => Number(option.textContent));
    expect(years[0]).toBe(MAX_YEAR);
    expect(years[years.length - 1]).toBe(MIN_YEAR);
    expect(years).toHaveLength(MAX_YEAR - MIN_YEAR + 1);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it("offers an 'All years' option so the filter can be unset", () => {
    render(<YearFilter value={null} onChange={() => {}} />);

    expect(screen.getByRole("option", { name: "All years" })).toBeInTheDocument();
  });

  it("includes the current year", () => {
    render(<YearFilter value={null} onChange={() => {}} />);

    expect(
      screen.getByRole("option", { name: String(MAX_YEAR - 1) })
    ).toBeInTheDocument();
  });

  it("reflects the current value", () => {
    render(<YearFilter value={1999} onChange={() => {}} />);

    expect(screen.getByLabelText("Year")).toHaveValue("1999");
  });

  it("shows 'All years' when value is null", () => {
    render(<YearFilter value={null} onChange={() => {}} />);

    expect(screen.getByRole("option", { name: "All years" })).toHaveProperty(
      "selected",
      true
    );
  });

  it("calls onChange with the selected year as a number (RF-3)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<YearFilter value={null} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Year"), "1999");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(1999);
  });

  it("calls onChange with null when 'All years' is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<YearFilter value={1999} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Year"), "All years");

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("is reachable with the keyboard (RF-18)", async () => {
    const user = userEvent.setup();
    render(<YearFilter value={null} onChange={() => {}} />);

    await user.tab();

    expect(screen.getByLabelText("Year")).toHaveFocus();
  });
});
