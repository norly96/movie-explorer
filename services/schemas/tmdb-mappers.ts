// Shared mapping rules used by every TMDB schema (movie-schema.ts,
// movie-detail-schema.ts, ...) so they can't silently drift on the
// same business rules.

export function extractReleaseYear(releaseDate: string): number | null {
  if (!releaseDate) return null;
  const year = Number(releaseDate.slice(0, 4));
  return Number.isNaN(year) ? null : year;
}

// vote_count === 0 means TMDB has no ratings yet: a real 0.0 vote
// average with actual votes must not be shown as "unrated".
export function toRating(
  voteAverage: number,
  voteCount: number
): number | null {
  return voteCount > 0 ? voteAverage : null;
}

// The featured movie's backdrop is shown at full width, so it comes from
// TMDB's largest size instead of enlarging a small one (home-redesign RF-33).
// Kept here as a constant on purpose: the shared image configuration
// (tmdb-config.ts) serves the cards' poster size and is left untouched.
export const TMDB_BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/original";

export function toBackdropUrl(backdropPath: string): string {
  return `${TMDB_BACKDROP_BASE_URL}${backdropPath}`;
}
