import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Movie } from "../services/schemas/movie-schema";
import { MovieGrid } from "./MovieGrid";

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
