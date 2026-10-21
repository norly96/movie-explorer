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
//
// Home redesign (RF-18, RF-19): two columns below `lg`, one row from `lg`. While
// "Clear filters" is not shown, an empty hidden placeholder of its size stays in
// its place, so showing or hiding the button moves nothing. The room lives here,
// not in ClearFiltersButton, which still renders nothing when hidden (plan.md D17).
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
    <div className="grid grid-cols-2 gap-3 lg:flex lg:items-end">
      <GenreFilter genres={genres} value={genreId} onChange={onGenreChange} />
      <YearFilter value={year} onChange={onYearChange} />
      <SortFilter value={sort} onChange={onSortChange} />
      {clearVisible ? (
        <ClearFiltersButton visible onClear={onClear} />
      ) : (
        <div
          data-slot="clear-filters-room"
          aria-hidden="true"
          className="h-(--size-control-touch) self-end lg:h-(--size-control) lg:w-(--size-clear-filters)"
        />
      )}
    </div>
  );
}
