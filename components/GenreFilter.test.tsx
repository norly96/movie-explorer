import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Genre } from "../services/schemas/genre-schema";
import { GenreFilter } from "./GenreFilter";

const GENRES: Genre[] = [
  { id: 28, name: "Action" },
  { id: 18, name: "Drama" },
  { id: 35, name: "Comedy" },
];

describe("GenreFilter", () => {
  it("renders nothing when genres is empty (RF-21, D14)", () => {
    const { container } = render(
      <GenreFilter genres={[]} value={null} onChange={() => {}} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders a labelled <select> with one option per genre (RF-2)", () => {
    render(<GenreFilter genres={GENRES} value={null} onChange={() => {}} />);

    const select = screen.getByLabelText("Genre");
    expect(select.tagName).toBe("SELECT");
    for (const genre of GENRES) {
      expect(
        screen.getByRole("option", { name: genre.name })
      ).toBeInTheDocument();
    }
  });

  it("offers an 'All genres' option so the filter can be unset", () => {
    render(<GenreFilter genres={GENRES} value={null} onChange={() => {}} />);

    expect(screen.getByRole("option", { name: "All genres" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(GENRES.length + 1);
  });

  it("reflects the current value", () => {
    render(<GenreFilter genres={GENRES} value={18} onChange={() => {}} />);

    expect(screen.getByLabelText("Genre")).toHaveValue("18");
  });

  it("shows 'All genres' when value is null", () => {
    render(<GenreFilter genres={GENRES} value={null} onChange={() => {}} />);

    expect(screen.getByRole("option", { name: "All genres" })).toHaveProperty(
      "selected",
      true
    );
  });

  it("calls onChange with the selected genre id as a number (RF-2)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GenreFilter genres={GENRES} value={null} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Genre"), "Drama");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(18);
  });

  it("calls onChange with null when 'All genres' is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GenreFilter genres={GENRES} value={28} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Genre"), "All genres");

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("is reachable with the keyboard (RF-18)", async () => {
    const user = userEvent.setup();
    render(<GenreFilter genres={GENRES} value={null} onChange={() => {}} />);

    await user.tab();

    expect(screen.getByLabelText("Genre")).toHaveFocus();
  });
});

// home-redesign RF-18, RF-20: in the redesigned bar the label is visually hidden
// but stays a real <label> that names the selector, the chevron is decorative,
// and the control is as high as the rest of the bar with 16px text.
describe("GenreFilter in the redesigned bar", () => {
  it("hides the label visually and still names the selector with it (RF-18)", () => {
    render(<GenreFilter genres={[{ id: 28, name: "Action" }]} value={null} onChange={() => {}} />);

    const label = screen.getByText("Genre");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveClass("sr-only");
    expect(screen.getByRole("combobox", { name: "Genre" })).toBeInTheDocument();
  });

  it("shows a decorative chevron and drops the native arrow (RF-18)", () => {
    const { container } = render(<GenreFilter genres={[{ id: 28, name: "Action" }]} value={null} onChange={() => {}} />);

    const icon = container.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByLabelText("Genre")).toHaveClass("appearance-none");
  });

  it("is 48px high on phones, 44px from lg, with 16px text (RF-20)", () => {
    render(<GenreFilter genres={[{ id: 28, name: "Action" }]} value={null} onChange={() => {}} />);

    const select = screen.getByLabelText("Genre");
    expect(select).toHaveClass("h-(--size-control-touch)");
    expect(select).toHaveClass("lg:h-(--size-control)");
    expect(select).toHaveClass("text-base");
  });
});
