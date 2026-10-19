import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Movie } from "../services/schemas/movie-schema";
import { MovieCard } from "./MovieCard";
import { MovieCardSkeleton } from "./MovieCardSkeleton";

function movie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: 550,
    title: "Fight Club",
    posterUrl: "https://image.tmdb.org/t/p/w500/poster.jpg",
    releaseYear: 1999,
    rating: 8.4,
    ...overrides,
  };
}

describe("MovieCard", () => {
  it("renders the poster when posterUrl is set (RF-2)", () => {
    render(<MovieCard movie={movie()} />);
    expect(screen.getByRole("img", { name: "Fight Club" })).toBeInTheDocument();
  });

  it("renders a placeholder instead of a broken image when posterUrl is null (RF-2)", () => {
    render(<MovieCard movie={movie({ posterUrl: null })} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders the year when present (RF-3)", () => {
    render(<MovieCard movie={movie({ releaseYear: 1999 })} />);
    expect(screen.getByText("1999")).toBeInTheDocument();
  });

  it("omits the year without breaking the layout when releaseYear is null (RF-3)", () => {
    render(<MovieCard movie={movie({ releaseYear: null })} />);
    expect(screen.queryByText(/^\d{4}$/)).not.toBeInTheDocument();
    // Title and rating still render — the card doesn't collapse.
    expect(screen.getByText("Fight Club")).toBeInTheDocument();
  });

  it("links to the movie's detail page (RF-7)", () => {
    render(<MovieCard movie={movie({ id: 550 })} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/movie/550");
  });
});

// docs/design.md → Posters and MovieCard: a missing poster is the same 2:3
// surface with a film icon, never a broken image; every card reserves a
// transparent 2px border so the hover (gold border) adds no layout shift, and
// the skeleton has the same footprint.
describe("MovieCard fallback poster and reserved border (RF-23, RF-35, RF-36)", () => {
  const frameOf = (container: HTMLElement) =>
    container.querySelector(".aspect-poster") as HTMLElement;

  it("shows a decorative 24px film icon in the same 2:3 surface when there is no poster", () => {
    const { container } = render(<MovieCard movie={movie({ posterUrl: null })} />);
    const frame = frameOf(container);
    const icon = frame.querySelector("svg");

    expect(frame).toHaveClass("aspect-poster", "bg-surface-raised");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveAttribute("width", "24");
    expect(icon).toHaveClass("text-subtle");
  });

  it("shows the poster and no film icon when there is one", () => {
    const { container } = render(<MovieCard movie={movie()} />);
    const frame = frameOf(container);

    expect(frame.querySelector("img")).not.toBeNull();
    expect(frame.querySelector("svg")).toBeNull();
  });

  it("gives every card a transparent 2px border at rest", () => {
    render(<MovieCard movie={movie()} />);

    expect(screen.getByRole("article")).toHaveClass("border-2", "border-transparent");
  });

  it("gives the skeleton the same border, so both have the same footprint", () => {
    const { container } = render(<MovieCardSkeleton />);

    expect(container.firstElementChild).toHaveClass("border-2", "border-transparent");
  });
});

// The posters that decide the home's first paint load eagerly with high fetch
// priority; the rest stay lazy (home-redesign RF-32). Next 16 deprecated the
// `priority` prop of next/image: for several candidates of the first paint its
// docs recommend loading="eager" with fetchPriority="high".
describe("MovieCard poster priority (RF-32)", () => {
  const posterOf = () => screen.getByRole("img", { name: "Fight Club" });

  it("loads the poster lazily by default", () => {
    render(<MovieCard movie={movie()} />);

    expect(posterOf()).toHaveAttribute("loading", "lazy");
    expect(posterOf()).not.toHaveAttribute("fetchpriority", "high");
  });

  it("loads the poster eagerly with high fetch priority when asked", () => {
    render(<MovieCard movie={movie()} priority />);

    expect(posterOf()).toHaveAttribute("loading", "eager");
    expect(posterOf()).toHaveAttribute("fetchpriority", "high");
  });

  it("does not break the missing-poster fallback", () => {
    render(<MovieCard movie={movie({ posterUrl: null })} priority />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Fight Club")).toBeInTheDocument();
  });
});
