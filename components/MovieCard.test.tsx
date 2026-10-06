import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Movie } from "../services/schemas/movie-schema";
import { MovieCard } from "./MovieCard";

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
