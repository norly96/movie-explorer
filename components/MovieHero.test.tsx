import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MovieDetail } from "../services/schemas/movie-detail-schema";
import { MovieHero } from "./MovieHero";

function movieDetail(overrides: Partial<MovieDetail> = {}): MovieDetail {
  return {
    id: 550,
    title: "Fight Club",
    originalTitle: null,
    tagline: "Mischief. Mayhem. Soap.",
    overview: "An insomniac office worker...",
    posterUrl: "https://image.tmdb.org/t/p/w500/poster.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w500/backdrop.jpg",
    releaseYear: 1999,
    runtimeMinutes: 139,
    genres: ["Drama"],
    rating: 8.4,
    status: "Released",
    originalLanguage: "en",
    homepageUrl: null,
    cast: [],
    directors: [],
    trailerKey: null,
    galleryUrls: [],
    ...overrides,
  };
}

describe("MovieHero", () => {
  it("renders title, tagline, year, runtime, genres and rating (RF-1)", () => {
    render(<MovieHero movie={movieDetail()} />);
    expect(screen.getByText("Fight Club")).toBeInTheDocument();
    expect(screen.getByText("Mischief. Mayhem. Soap.")).toBeInTheDocument();
    expect(screen.getByText("1999")).toBeInTheDocument();
    expect(screen.getByText("139 min")).toBeInTheDocument();
    expect(screen.getByText("Drama")).toBeInTheDocument();
    expect(screen.getByText("8.4")).toBeInTheDocument();
  });

  it("renders the original title when different from the title (RF-1)", () => {
    render(
      <MovieHero movie={movieDetail({ originalTitle: "El club de la pelea" })} />
    );
    expect(screen.getByText("El club de la pelea")).toBeInTheDocument();
  });

  it("renders poster and backdrop via next/image with descriptive alt text (RF-12)", () => {
    render(<MovieHero movie={movieDetail()} />);
    const poster = screen.getByAltText("Fight Club poster");
    const backdrop = screen.getByAltText("Fight Club backdrop");

    expect(poster).toHaveAttribute("data-nimg");
    expect(backdrop).toHaveAttribute("data-nimg");
  });

  it("omits the poster when posterUrl is null, without breaking the layout (RF-6)", () => {
    render(<MovieHero movie={movieDetail({ posterUrl: null })} />);
    expect(screen.queryByAltText("Fight Club poster")).not.toBeInTheDocument();
    expect(screen.getByText("Fight Club")).toBeInTheDocument();
  });

  it("omits the backdrop when backdropUrl is null (RF-6)", () => {
    render(<MovieHero movie={movieDetail({ backdropUrl: null })} />);
    expect(
      screen.queryByAltText("Fight Club backdrop")
    ).not.toBeInTheDocument();
  });

  it("omits the tagline and original title when absent, without breaking the layout (RF-6)", () => {
    render(
      <MovieHero
        movie={movieDetail({ tagline: null, originalTitle: null })}
      />
    );
    expect(screen.queryByText("Mischief. Mayhem. Soap.")).not.toBeInTheDocument();
    expect(screen.getByText("Fight Club")).toBeInTheDocument();
  });

  it("omits the year and runtime when absent (RF-6)", () => {
    render(
      <MovieHero movie={movieDetail({ releaseYear: null, runtimeMinutes: null })} />
    );
    expect(screen.queryByText(/^\d{4}$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/min$/)).not.toBeInTheDocument();
  });

  it("renders no genre badges when the genre list is empty (RF-6)", () => {
    render(<MovieHero movie={movieDetail({ genres: [] })} />);
    expect(screen.queryByText("Drama")).not.toBeInTheDocument();
  });
});
