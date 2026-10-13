import type { SortOption } from "../app/explore-params";
import type { Genre } from "../services/schemas/genre-schema";
import { ClearFiltersButton } from "./ClearFiltersButton";
import { GenreFilter } from "./GenreFilter";
import { SortFilter } from "./SortFilter";
import { YearFilter } from "./YearFilter";

export interface FilterBarProps {
  genres: Genre[]; // [] hides the genre control (RF-21)
  genreId: number | null;
  year: number | null;
  sort: SortOption | null;
  clearVisible: boolean;
  onGenreChange: (genreId: number | null) => void;
  onYearChange: (year: number | null) => void;
  onSortChange: (sort: SortOption | null) => void;
  onClear: () => void;
}

// Presentation only: lays out the filters and forwards props. The mode
// switching and URL writes (RF-7, RF-8, RF-20) belong to ExplorerClient.
export function FilterBar({
  genres,
  genreId,
  year,
  sort,
  clearVisible,
  onGenreChange,
  onYearChange,
  onSortChange,
  onClear,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <GenreFilter genres={genres} value={genreId} onChange={onGenreChange} />
      <YearFilter value={year} onChange={onYearChange} />
      <SortFilter value={sort} onChange={onSortChange} />
      <ClearFiltersButton visible={clearVisible} onClear={onClear} />
    </div>
  );
}
