import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Genre } from "../services/schemas/genre-schema";
import { FilterBar, type FilterBarProps } from "./FilterBar";

const GENRES: Genre[] = [
  { id: 28, name: "Action" },
  { id: 18, name: "Drama" },
];

function renderBar(overrides: Partial<FilterBarProps> = {}) {
  const props: FilterBarProps = {
    genres: GENRES,
    genreId: null,
    year: null,
    sort: null,
    clearVisible: true,
    onGenreChange: vi.fn(),
    onYearChange: vi.fn(),
    onSortChange: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  };
  render(<FilterBar {...props} />);
  return props;
}

describe("FilterBar", () => {
  it("renders the genre, year and sort filters and the clear button together", () => {
    renderBar();

    expect(screen.getByLabelText("Genre")).toBeInTheDocument();
    expect(screen.getByLabelText("Year")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort by")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Clear filters" })
    ).toBeInTheDocument();
  });

  it("forwards the current genre, year and sort values to each control", () => {
    renderBar({ genreId: 18, year: 1999, sort: "vote_average.desc" });

    expect(screen.getByLabelText("Genre")).toHaveValue("18");
    expect(screen.getByLabelText("Year")).toHaveValue("1999");
    expect(screen.getByLabelText("Sort by")).toHaveValue("vote_average.desc");
  });

  it("forwards the genres list so the genre control has its options (RF-2)", () => {
    renderBar();

    expect(screen.getByRole("option", { name: "Action" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Drama" })).toBeInTheDocument();
  });

  it("forwards GenreFilter's onChange as onGenreChange (RF-2)", async () => {
    const user = userEvent.setup();
    const props = renderBar();

    await user.selectOptions(screen.getByLabelText("Genre"), "Drama");

    expect(props.onGenreChange).toHaveBeenCalledWith(18);
    expect(props.onYearChange).not.toHaveBeenCalled();
    expect(props.onSortChange).not.toHaveBeenCalled();
  });

  it("forwards YearFilter's onChange as onYearChange (RF-3)", async () => {
    const user = userEvent.setup();
    const props = renderBar();

    await user.selectOptions(screen.getByLabelText("Year"), "1999");

    expect(props.onYearChange).toHaveBeenCalledWith(1999);
    expect(props.onGenreChange).not.toHaveBeenCalled();
    expect(props.onSortChange).not.toHaveBeenCalled();
  });

  it("forwards SortFilter's onChange as onSortChange (RF-4)", async () => {
    const user = userEvent.setup();
    const props = renderBar();

    await user.selectOptions(screen.getByLabelText("Sort by"), "Newest first");

    expect(props.onSortChange).toHaveBeenCalledWith("primary_release_date.desc");
    expect(props.onGenreChange).not.toHaveBeenCalled();
    expect(props.onYearChange).not.toHaveBeenCalled();
  });

  it("forwards the clear button's click as onClear (RF-17)", async () => {
    const user = userEvent.setup();
    const props = renderBar();

    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(props.onClear).toHaveBeenCalledTimes(1);
  });

  it("hides the clear button when clearVisible is false (RF-17)", () => {
    renderBar({ clearVisible: false });

    expect(
      screen.queryByRole("button", { name: "Clear filters" })
    ).not.toBeInTheDocument();
  });

  it("keeps year and sort usable when genres is empty (RF-21)", () => {
    renderBar({ genres: [] });

    expect(screen.queryByLabelText("Genre")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Year")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort by")).toBeInTheDocument();
  });

  it("is keyboard-navigable in visual order (RF-18)", async () => {
    const user = userEvent.setup();
    renderBar();

    await user.tab();
    expect(screen.getByLabelText("Genre")).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Year")).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Sort by")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Clear filters" })).toHaveFocus();
  });
});
