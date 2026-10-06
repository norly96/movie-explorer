import { z } from "zod";
import { extractReleaseYear, toRating } from "./tmdb-mappers";

const MAX_CAST = 12;
const MAX_GALLERY_IMAGES = 12;

const TmdbGenreRawSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const TmdbCastMemberRawSchema = z.object({
  id: z.number(),
  name: z.string(),
  character: z.string(),
  profile_path: z.string().nullable(),
  order: z.number(),
});

const TmdbCrewMemberRawSchema = z.object({
  id: z.number(),
  name: z.string(),
  job: z.string(),
  profile_path: z.string().nullable(),
});

const TmdbVideoRawSchema = z.object({
  key: z.string(),
  site: z.string(), // "YouTube" | "Vimeo" | ...
  type: z.string(), // "Trailer" | "Teaser" | ...
  official: z.boolean(),
  name: z.string(),
});

const TmdbBackdropRawSchema = z.object({
  file_path: z.string(),
});

// No .strict(): same reasoning as movie-schema.ts — only the fields
// this feature uses are picked out of a much larger TMDB response.
export const TmdbMovieDetailRawSchema = z.object({
  id: z.number(),
  title: z.string(),
  original_title: z.string(),
  tagline: z.string(),
  overview: z.string(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  release_date: z.string(),
  runtime: z.number().nullable(),
  genres: z.array(TmdbGenreRawSchema),
  vote_average: z.number(),
  vote_count: z.number(),
  status: z.string(),
  original_language: z.string(),
  homepage: z.string(),
  credits: z.object({
    cast: z.array(TmdbCastMemberRawSchema),
    crew: z.array(TmdbCrewMemberRawSchema),
  }),
  videos: z.object({
    results: z.array(TmdbVideoRawSchema),
  }),
  images: z.object({
    backdrops: z.array(TmdbBackdropRawSchema),
  }),
});

export type TmdbMovieDetailRaw = z.infer<typeof TmdbMovieDetailRawSchema>;

export interface CastMember {
  id: number;
  name: string;
  character: string;
  photoUrl: string | null;
}

// Domain shape consumed by components — decoupled from TMDB's field
// names and quirks.
export interface MovieDetail {
  id: number;
  title: string;
  originalTitle: string | null; // null when same as `title`
  tagline: string | null;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseYear: number | null;
  runtimeMinutes: number | null; // null when 0/unknown
  genres: string[];
  rating: number | null;
  status: string;
  originalLanguage: string;
  homepageUrl: string | null;
  cast: CastMember[]; // up to 12 (RF-2), [] if none (RF-6)
  directors: string[]; // names, [] if none — joining is CastList's job
  trailerKey: string | null; // YouTube key, null if none
  galleryUrls: string[]; // up to 12 backdrops, excluding the hero's own
}

function selectTrailerKey(
  videos: z.infer<typeof TmdbVideoRawSchema>[]
): string | null {
  const candidates = videos.filter(
    (video) => video.type === "Trailer" && video.site === "YouTube"
  );
  if (candidates.length === 0) return null;

  const official = candidates.find((video) => video.official);
  return (official ?? candidates[0]).key;
}

export function toMovieDetail(
  raw: TmdbMovieDetailRaw,
  imageBaseUrl: string
): MovieDetail {
  const cast: CastMember[] = [...raw.credits.cast]
    .sort((a, b) => a.order - b.order)
    .slice(0, MAX_CAST)
    .map((member) => ({
      id: member.id,
      name: member.name,
      character: member.character,
      photoUrl: member.profile_path
        ? `${imageBaseUrl}${member.profile_path}`
        : null,
    }));

  const directors = raw.credits.crew
    .filter((member) => member.job === "Director")
    .map((member) => member.name);

  // Excludes the backdrop already shown in the hero (RF-5: "beyond
  // the one shown in the hero") — TMDB's /images list usually
  // includes that same file.
  const galleryUrls = raw.images.backdrops
    .filter((backdrop) => backdrop.file_path !== raw.backdrop_path)
    .slice(0, MAX_GALLERY_IMAGES)
    .map((backdrop) => `${imageBaseUrl}${backdrop.file_path}`);

  return {
    id: raw.id,
    title: raw.title,
    originalTitle:
      raw.original_title !== raw.title ? raw.original_title : null,
    tagline: raw.tagline ? raw.tagline : null,
    overview: raw.overview ? raw.overview : null,
    posterUrl: raw.poster_path ? `${imageBaseUrl}${raw.poster_path}` : null,
    backdropUrl: raw.backdrop_path
      ? `${imageBaseUrl}${raw.backdrop_path}`
      : null,
    releaseYear: extractReleaseYear(raw.release_date),
    runtimeMinutes: raw.runtime && raw.runtime > 0 ? raw.runtime : null,
    genres: raw.genres.map((genre) => genre.name),
    rating: toRating(raw.vote_average, raw.vote_count),
    status: raw.status,
    originalLanguage: raw.original_language,
    homepageUrl: raw.homepage ? raw.homepage : null,
    cast,
    directors,
    trailerKey: selectTrailerKey(raw.videos.results),
    galleryUrls,
  };
}
