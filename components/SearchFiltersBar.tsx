import type { Ref } from "react";
import { FilterBar, type FilterBarProps } from "./FilterBar";
import { SearchInput } from "./SearchInput";

export interface SearchFiltersBarProps extends FilterBarProps {
  searchText: string;
  onSearchChange: (query: string) => void;
  // So the hero can send focus to the search field (RF-13).
  searchInputRef?: Ref<HTMLInputElement>;
  // The bar itself: where the back-to-top button scrolls to (RF-25).
  barRef?: Ref<HTMLDivElement>;
}

// Presentation only (home-redesign RF-18): the search field and the filter group
// in one bar, in this DOM order so the keyboard order equals the visual order.
// From `lg` it is one row, the search field taking the free room up to its width
// token; below it, the field on top of the filter group's two columns.
export function SearchFiltersBar({
  searchText,
  onSearchChange,
  searchInputRef,
  barRef,
  ...filters
}: SearchFiltersBarProps) {
  return (
    <div
      ref={barRef}
      className="flex flex-col gap-3 lg:flex-row lg:items-end"
    >
      <div
        data-slot="search-field"
        className="min-w-0 lg:max-w-(--size-search) lg:flex-1"
      >
        <SearchInput
          value={searchText}
          onChange={onSearchChange}
          inputRef={searchInputRef}
        />
      </div>
      <FilterBar {...filters} />
    </div>
  );
}
