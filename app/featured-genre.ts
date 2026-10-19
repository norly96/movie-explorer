import type { Genre } from "../services/schemas/genre-schema";

// The featured hero shows one genre: the first of the movie's genres, in TMDB's
// order, that has a name in the genre list (home-redesign RF-6). Ids the list
// does not know are skipped; null means the genre is simply omitted (RF-16),
// which is also what happens when the genre list failed to load.
export function firstGenreName(
  genreIds: number[],
  genres: Genre[]
): string | null {
  for (const id of genreIds) {
    const genre = genres.find((candidate) => candidate.id === id);
    if (genre) return genre.name;
  }
  return null;
}
