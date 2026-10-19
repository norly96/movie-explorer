import { z } from "zod";
import { extractReleaseYear, toBackdropUrl, toRating } from "./tmdb-mappers";

// Only the fields this feature uses are picked out of TMDB's response.
// No .strict(): TMDB adding fields later (overview, genre_ids, ...)
// must not break parsing.
export const TmdbMovieRawSchema = z.object({
  id: z.number(),
  title: z.string(),
  poster_path: z.string().nullable(),
  release_date: z.string(),
  vote_average: z.number(),
  vote_count: z.number(),
  // Used only by the featured movie (home-redesign). Optional because the
  // cards never need them and older fixtures do not carry them; TMDB sends
  // them in every list response.
  backdrop_path: z.string().nullable().optional(),
  overview: z.string().optional(),
  genre_ids: z.array(z.number()).optional(),
});

export type TmdbMovieRaw = z.infer<typeof TmdbMovieRawSchema>;

export const TmdbPopularResponseRawSchema = z.object({
  page: z.number(),
  results: z.array(TmdbMovieRawSchema),
  total_pages: z.number(),
  total_results: z.number(),
});

export type TmdbPopularResponseRaw = z.infer<
  typeof TmdbPopularResponseRawSchema
>;

// Domain shape consumed by components — decoupled from TMDB's field
// names and quirks.
export interface Movie {
  id: number;
  title: string;
  posterUrl: string | null;
  releaseYear: number | null;
  rating: number | null;
}

export function toMovie(raw: TmdbMovieRaw, imageBaseUrl: string): Movie {
  return {
    id: raw.id,
    title: raw.title,
    posterUrl: raw.poster_path ? `${imageBaseUrl}${raw.poster_path}` : null,
    releaseYear: extractReleaseYear(raw.release_date),
    rating: toRating(raw.vote_average, raw.vote_count),
  };
}

// The movie shown in the home's hero (home-redesign RF-6). A separate type on
// purpose: Movie is the card's shape and must not carry hero-only data.
export interface FeaturedMovie {
  id: number;
  title: string;
  overview: string; // "" when TMDB sends none: the synopsis is then omitted
  backdropUrl: string; // from the "original" size
  genreIds: number[];
  releaseYear: number | null;
  rating: number | null; // same rule as the card: null → "No rating"
}

export function toFeaturedMovie(
  raw: TmdbMovieRaw & { backdrop_path: string }
): FeaturedMovie {
  return {
    id: raw.id,
    title: raw.title,
    overview: raw.overview ?? "",
    backdropUrl: toBackdropUrl(raw.backdrop_path),
    genreIds: raw.genre_ids ?? [],
    releaseYear: extractReleaseYear(raw.release_date),
    rating: toRating(raw.vote_average, raw.vote_count),
  };
}

// The first movie of the list, in order, that has a backdrop; undefined when
// none does (RF-6, RF-9).
export function pickFeatured(raw: TmdbMovieRaw[]): FeaturedMovie | undefined {
  for (const movie of raw) {
    if (movie.backdrop_path) {
      return toFeaturedMovie({ ...movie, backdrop_path: movie.backdrop_path });
    }
  }
  return undefined;
}
