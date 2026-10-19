import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Movie } from "../services/schemas/movie-schema";
import { MovieGrid } from "./MovieGrid";
import { PRIORITY_POSTERS } from "./MovieGrid";

function movie(id: number): Movie {
  return {
    id,
    title: `Movie ${id}`,
    posterUrl: null,
    releaseYear: 2024,
    rating: 7,
  };
}

describe("MovieGrid", () => {
  it("renders one MovieCard per movie (RF-1)", () => {
    render(<MovieGrid movies={[movie(1), movie(2), movie(3)]} />);
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });
});

// Only the first posters are prioritized (home-redesign RF-32): prioritizing
// the whole grid would compete with the image that really decides the paint.
describe("MovieGrid poster priority (RF-32)", () => {
  function withPoster(id: number): Movie {
    return { ...movie(id), posterUrl: `https://image.tmdb.org/t/p/w500/p${id}.jpg` };
  }

  it("prioritizes a small, fixed number of posters", () => {
    expect(PRIORITY_POSTERS).toBeGreaterThanOrEqual(1);
    expect(PRIORITY_POSTERS).toBeLessThanOrEqual(4);
  });

  it("loads the first posters eagerly with high priority and the rest lazily", () => {
    const movies = Array.from({ length: PRIORITY_POSTERS + 3 }, (_, i) => withPoster(i + 1));
    render(<MovieGrid movies={movies} />);

    const posters = screen.getAllByRole("img");
    expect(posters).toHaveLength(movies.length);
    posters.forEach((poster, index) => {
      if (index < PRIORITY_POSTERS) {
        expect(poster).toHaveAttribute("loading", "eager");
        expect(poster).toHaveAttribute("fetchpriority", "high");
      } else {
        expect(poster).toHaveAttribute("loading", "lazy");
        expect(poster).not.toHaveAttribute("fetchpriority", "high");
      }
    });
  });
});
