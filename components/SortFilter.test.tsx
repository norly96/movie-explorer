import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SORT_OPTIONS } from "../app/explore-params";
import { SortFilter } from "./SortFilter";

describe("SortFilter", () => {
  it("renders a labelled <select> (RF-4)", () => {
    render(<SortFilter value={null} onChange={() => {}} />);

    const select = screen.getByLabelText("Sort by");
    expect(select.tagName).toBe("SELECT");
  });

  it("renders every SortOption value as an option (RF-4)", () => {
    render(<SortFilter value={null} onChange={() => {}} />);

    const values = screen
      .getAllByRole("option")
      .map((option) => option.getAttribute("value"))
      .filter((value) => value !== "");
    expect(values).toEqual([...SORT_OPTIONS]);
  });

  it("gives each option a human-readable label", () => {
    render(<SortFilter value={null} onChange={() => {}} />);

    expect(screen.getByRole("option", { name: "Most popular" })).toHaveValue(
      "popularity.desc"
    );
    expect(screen.getByRole("option", { name: "Least popular" })).toHaveValue(
      "popularity.asc"
    );
    expect(screen.getByRole("option", { name: "Highest rated" })).toHaveValue(
      "vote_average.desc"
    );
    expect(screen.getByRole("option", { name: "Newest first" })).toHaveValue(
      "primary_release_date.desc"
    );
    expect(screen.getByRole("option", { name: "Oldest first" })).toHaveValue(
      "primary_release_date.asc"
    );
  });

  it("offers a default option so the sort can be unset", () => {
    render(<SortFilter value="popularity.asc" onChange={() => {}} />);

    expect(
      screen.getByRole("option", { name: "Default order" })
    ).toBeInTheDocument();
  });

  it("reflects the current value", () => {
    render(<SortFilter value="vote_average.desc" onChange={() => {}} />);

    expect(screen.getByLabelText("Sort by")).toHaveValue("vote_average.desc");
  });

  it("shows the default option when value is null", () => {
    render(<SortFilter value={null} onChange={() => {}} />);

    expect(screen.getByRole("option", { name: "Default order" })).toHaveProperty(
      "selected",
      true
    );
  });

  it("calls onChange with the selected SortOption (RF-4)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SortFilter value={null} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Sort by"), "Highest rated");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("vote_average.desc");
  });

  it("calls onChange with null when the default option is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SortFilter value="popularity.asc" onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Sort by"), "Default order");

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("is reachable with the keyboard (RF-18)", async () => {
    const user = userEvent.setup();
    render(<SortFilter value={null} onChange={() => {}} />);

    await user.tab();

    expect(screen.getByLabelText("Sort by")).toHaveFocus();
  });
});
