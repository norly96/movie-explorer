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

// home-redesign RF-18, RF-19: when "Clear filters" is not shown, an empty,
// hidden placeholder keeps its room, so showing or hiding the button never moves
// another control. The button component itself stays as it is (plan.md D17).
describe("FilterBar reserved room (home-redesign RF-19)", () => {
  function room(container: HTMLElement) {
    return container.querySelector('[data-slot="clear-filters-room"]');
  }

  function renderIn(clearVisible: boolean) {
    return render(
      <FilterBar
        genres={GENRES}
        genreId={null}
        year={null}
        sort={null}
        clearVisible={clearVisible}
        onGenreChange={vi.fn()}
        onYearChange={vi.fn()}
        onSortChange={vi.fn()}
        onClear={vi.fn()}
      />
    );
  }

  it("keeps an empty, hidden placeholder where the button would be when it is not shown", () => {
    const { container } = renderIn(false);

    const placeholder = room(container);
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toBeEmptyDOMElement();
    expect(placeholder).toHaveAttribute("aria-hidden", "true");
    expect(
      screen.queryByRole("button", { name: "Clear filters" })
    ).not.toBeInTheDocument();
  });

  it("puts the placeholder in the same place, after the selectors, as the button", () => {
    const hidden = renderIn(false);
    const hiddenChildren = hidden.container.firstElementChild!.children;
    const placeholder = room(hidden.container);
    expect(hiddenChildren).toHaveLength(4);
    expect(hiddenChildren[3]).toBe(placeholder);
    hidden.unmount();

    const shown = renderIn(true);
    const shownChildren = shown.container.firstElementChild!.children;
    expect(shownChildren).toHaveLength(4);
    expect(shownChildren[3]).toBe(
      screen.getByRole("button", { name: "Clear filters" })
    );
  });

  it("has no placeholder while the button is shown", () => {
    const { container } = renderIn(true);

    expect(room(container)).not.toBeInTheDocument();
  });

  it("keeps the three selectors in the same order whether the button is shown or not", () => {
    const order = (container: HTMLElement) =>
      [...container.querySelectorAll("select")].map((select) => select.labels?.[0]?.textContent);

    const hidden = renderIn(false);
    const withoutButton = order(hidden.container);
    hidden.unmount();
    const shown = renderIn(true);

    expect(withoutButton).toEqual(["Genre", "Year", "Sort by"]);
    expect(order(shown.container)).toEqual(withoutButton);
  });

  it("does not add the placeholder to the tab order", async () => {
    const user = userEvent.setup();
    renderIn(false);

    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();

    expect(document.body).toHaveFocus();
  });

  it("sizes the room from tokens, never from fixed pixel values", () => {
    const { container } = renderIn(false);

    const classes = room(container)!.className;
    expect(classes).toContain("h-(--size-control-touch)");
    expect(classes).toContain("lg:h-(--size-control)");
    expect(classes).toContain("lg:w-(--size-clear-filters)");
    expect(classes).not.toMatch(/\[\d/);
  });
});

// Found in a real browser after T36: the button is only 38px high and 113px wide,
// so it did not fill the room reserved for it and was shorter than the other
// controls (RF-20). ClearFiltersButton stays untouched; the bar sizes the button
// it contains.
describe("FilterBar sizes the Clear filters button like its room (RF-19, RF-20)", () => {
  it("gives the button the height of the other controls and the width of the room", () => {
    const { container } = render(
      <FilterBar
        genres={GENRES}
        genreId={null}
        year={null}
        sort={null}
        clearVisible
        onGenreChange={vi.fn()}
        onYearChange={vi.fn()}
        onSortChange={vi.fn()}
        onClear={vi.fn()}
      />
    );

    const classes = (container.firstElementChild as HTMLElement).className;
    expect(classes).toContain("[&>button]:h-(--size-control-touch)");
    expect(classes).toContain("lg:[&>button]:h-(--size-control)");
    expect(classes).toContain("[&>button]:w-full");
    expect(classes).toContain("lg:[&>button]:w-(--size-clear-filters)");
    expect(classes).not.toMatch(/\[\d/);
  });
});
