import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Genre } from "../services/schemas/genre-schema";
import {
  SearchFiltersBar,
  type SearchFiltersBarProps,
} from "./SearchFiltersBar";

const GENRES: Genre[] = [
  { id: 28, name: "Action" },
  { id: 18, name: "Drama" },
];

function renderBar(overrides: Partial<SearchFiltersBarProps> = {}) {
  const props: SearchFiltersBarProps = {
    searchText: "",
    onSearchChange: vi.fn(),
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
  const view = render(<SearchFiltersBar {...props} />);
  return { props, ...view };
}

// home-redesign RF-18: the search field and the filter group in one bar.
describe("SearchFiltersBar", () => {
  it("renders the search field, then genre, year, sort and the clear control in that DOM order", () => {
    renderBar();

    const controls = [
      screen.getByLabelText("Search movies"),
      screen.getByLabelText("Genre"),
      screen.getByLabelText("Year"),
      screen.getByLabelText("Sort by"),
      screen.getByRole("button", { name: "Clear filters" }),
    ];
    for (let i = 1; i < controls.length; i++) {
      expect(
        controls[i - 1].compareDocumentPosition(controls[i]) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
  });

  it("is reachable with the keyboard in that same order", async () => {
    const user = userEvent.setup();
    renderBar();

    await user.tab();
    expect(screen.getByLabelText("Search movies")).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Genre")).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Year")).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Sort by")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Clear filters" })).toHaveFocus();
  });

  it("shows the search text and forwards every keystroke", async () => {
    const user = userEvent.setup();
    const { props } = renderBar({ searchText: "ma" });

    expect(screen.getByLabelText("Search movies")).toHaveValue("ma");
    await user.type(screen.getByLabelText("Search movies"), "t");

    expect(props.onSearchChange).toHaveBeenCalledWith("mat");
  });

  it("forwards the genre, year and sort values and their changes", async () => {
    const user = userEvent.setup();
    const { props } = renderBar({
      genreId: 18,
      year: 1999,
      sort: "vote_average.desc",
    });

    expect(screen.getByLabelText("Genre")).toHaveValue("18");
    expect(screen.getByLabelText("Year")).toHaveValue("1999");
    expect(screen.getByLabelText("Sort by")).toHaveValue("vote_average.desc");

    await user.selectOptions(screen.getByLabelText("Genre"), "Action");
    await user.selectOptions(screen.getByLabelText("Year"), "2001");
    await user.selectOptions(screen.getByLabelText("Sort by"), "Newest first");

    expect(props.onGenreChange).toHaveBeenCalledWith(28);
    expect(props.onYearChange).toHaveBeenCalledWith(2001);
    expect(props.onSortChange).toHaveBeenCalledWith("primary_release_date.desc");
  });

  it("forwards the clear control and keeps its room when it is hidden", async () => {
    const user = userEvent.setup();
    const shown = renderBar();

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(shown.props.onClear).toHaveBeenCalledTimes(1);
    shown.unmount();

    const { container } = renderBar({ clearVisible: false });
    expect(
      screen.queryByRole("button", { name: "Clear filters" })
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-slot="clear-filters-room"]')
    ).toBeInTheDocument();
  });

  it("hides the genre control when there are no genres", () => {
    renderBar({ genres: [] });

    expect(screen.queryByLabelText("Genre")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Year")).toBeInTheDocument();
  });

  it("gives the reference to the search input to whoever asks for it", () => {
    const searchInputRef = createRef<HTMLInputElement>();
    renderBar({ searchInputRef });

    expect(searchInputRef.current).toBe(screen.getByLabelText("Search movies"));
  });

  it("exposes the bar itself as the anchor of the back-to-top button (RF-25)", () => {
    const barRef = createRef<HTMLDivElement>();
    const { container } = renderBar({ barRef });

    expect(barRef.current).toBe(container.firstElementChild);
    expect(barRef.current).toContainElement(screen.getByLabelText("Search movies"));
    expect(barRef.current).toContainElement(screen.getByLabelText("Sort by"));
  });

  it("lays out one row from lg and a column below it, with no fixed pixel values", () => {
    const { container } = renderBar();

    const classes = (container.firstElementChild as HTMLElement).className;
    expect(classes).toContain("flex-col");
    expect(classes).toContain("lg:flex-row");
    expect(classes).not.toMatch(/\[\d/);
  });

  it("lets the search field shrink to fit up to its width token on wide screens (RF-18)", () => {
    const { container } = renderBar();

    const field = screen
      .getByLabelText("Search movies")
      .closest('[data-slot="search-field"]') as HTMLElement;
    expect(container.firstElementChild).toContainElement(field);
    expect(field).toHaveClass("lg:flex-1");
    expect(field).toHaveClass("lg:max-w-(--size-search)");
  });
});
