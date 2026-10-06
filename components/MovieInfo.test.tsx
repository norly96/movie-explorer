import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MovieDetail } from "../services/schemas/movie-detail-schema";
import { MovieInfo } from "./MovieInfo";

function movieDetail(overrides: Partial<MovieDetail> = {}): MovieDetail {
  return {
    id: 550,
    title: "Fight Club",
    originalTitle: null,
    tagline: null,
    overview: "An insomniac office worker...",
    posterUrl: null,
    backdropUrl: null,
    releaseYear: 1999,
    runtimeMinutes: 139,
    genres: [],
    rating: 8.4,
    status: "Released",
    originalLanguage: "en",
    homepageUrl: "https://example.com/fight-club",
    cast: [],
    directors: [],
    trailerKey: null,
    galleryUrls: [],
    ...overrides,
  };
}

describe("MovieInfo", () => {
  it("renders overview, status, language and the homepage link (RF-1)", () => {
    render(<MovieInfo movie={movieDetail()} />);
    expect(screen.getByText("An insomniac office worker...")).toBeInTheDocument();
    expect(screen.getByText("Released")).toBeInTheDocument();
    expect(screen.getByText("en")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /official site/i })).toHaveAttribute(
      "href",
      "https://example.com/fight-club"
    );
  });

  it("omits the overview when null, without breaking the layout (RF-6)", () => {
    render(<MovieInfo movie={movieDetail({ overview: null })} />);
    expect(
      screen.queryByText("An insomniac office worker...")
    ).not.toBeInTheDocument();
    expect(screen.getByText("Released")).toBeInTheDocument();
  });

  it("omits the homepage link when null (RF-6)", () => {
    render(<MovieInfo movie={movieDetail({ homepageUrl: null })} />);
    expect(
      screen.queryByRole("link", { name: /official site/i })
    ).not.toBeInTheDocument();
  });
});
