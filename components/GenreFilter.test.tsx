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
