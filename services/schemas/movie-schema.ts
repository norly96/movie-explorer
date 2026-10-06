import { z } from "zod";
import { extractReleaseYear, toRating } from "./tmdb-mappers";

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
