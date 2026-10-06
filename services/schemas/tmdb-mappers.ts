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
