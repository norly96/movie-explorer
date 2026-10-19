import type { Genre } from "../services/schemas/genre-schema";
import { SORT_LABELS } from "../components/SortFilter";
import type { ExploreFilters } from "./explore-params";

// The heading above the results says what is being shown (home-redesign
// RF-21), and the same text is announced once the results load (RF-22).
//
// Search: the trimmed text between curly quotes. Filters: the names of the
// active ones, in the order genre, year, sort, joined by a middle dot. A
// genre the list cannot name is left out; if that leaves nothing, the heading
// is generic rather than empty.
export function resultsHeading(filters: ExploreFilters, genres: Genre[]): string {
  if (filters.mode === "search") {
    return `Results for “${filters.query.trim()}”`;
  }
  if (filters.mode === "popular") return "Popular movies";

  const genre =
    filters.genreId === null
      ? undefined
      : genres.find((candidate) => candidate.id === filters.genreId)?.name;
  const names = [
    genre,
    filters.year === null ? undefined : String(filters.year),
    filters.sort === null ? undefined : SORT_LABELS[filters.sort],
  ].filter((name): name is string => name !== undefined);

  return names.length > 0 ? names.join(" · ") : "Filtered movies";
}
