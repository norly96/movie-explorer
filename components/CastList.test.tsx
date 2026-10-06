import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CastMember } from "../services/schemas/movie-detail-schema";
import { CastList } from "./CastList";

function castMember(overrides: Partial<CastMember> = {}): CastMember {
  return {
    id: 1,
    name: "Brad Pitt",
    character: "Tyler Durden",
    photoUrl: "https://image.tmdb.org/t/p/w500/pitt.jpg",
    ...overrides,
  };
}

describe("CastList", () => {
  it("renders cast members with photo, name and character (RF-2)", () => {
    render(<CastList cast={[castMember()]} directors={["David Fincher"]} />);
    expect(screen.getByText("Brad Pitt")).toBeInTheDocument();
    expect(screen.getByText("Tyler Durden")).toBeInTheDocument();
  });

  it("renders cast photos via next/image with descriptive alt text (RF-12)", () => {
    render(<CastList cast={[castMember()]} directors={[]} />);
    const photo = screen.getByAltText("Brad Pitt");
    expect(photo).toHaveAttribute("data-nimg");
  });

  it("omits a cast member's photo without breaking the layout when null (RF-6)", () => {
    render(
      <CastList cast={[castMember({ photoUrl: null })]} directors={[]} />
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Brad Pitt")).toBeInTheDocument();
  });

  it("renders a single director's name (RF-3)", () => {
    render(<CastList cast={[]} directors={["David Fincher"]} />);
    expect(screen.getByText(/David Fincher/)).toBeInTheDocument();
  });

  it("joins two directors with '&' (RF-3)", () => {
    render(<CastList cast={[]} directors={["A", "B"]} />);
    expect(screen.getByText(/A & B/)).toBeInTheDocument();
  });

  it("joins three or more directors with commas and a final '&' (RF-3)", () => {
    render(<CastList cast={[]} directors={["A", "B", "C"]} />);
    expect(screen.getByText(/A, B & C/)).toBeInTheDocument();
  });

  it("shows the director line even when there is no cast (RF-6)", () => {
    render(<CastList cast={[]} directors={["David Fincher"]} />);
    expect(screen.getByText(/David Fincher/)).toBeInTheDocument();
  });

  it("shows the cast grid even when there is no director (RF-6)", () => {
    render(<CastList cast={[castMember()]} directors={[]} />);
    expect(screen.getByText("Brad Pitt")).toBeInTheDocument();
  });

  it("renders nothing when both cast and directors are empty (RF-6)", () => {
    const { container } = render(<CastList cast={[]} directors={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
