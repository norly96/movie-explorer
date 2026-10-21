import { useId } from "react";
import { SORT_OPTIONS, type SortOption } from "../app/explore-params";
import { ChevronDownIcon } from "./icons/ChevronDownIcon";

export interface SortFilterProps {
  value: SortOption | null;
  onChange: (sort: SortOption | null) => void;
}

// Record<SortOption, …> makes a new sort option a compile error until it
// gets a label here.
export const SORT_LABELS: Record<SortOption, string> = {
  "popularity.desc": "Most popular",
  "popularity.asc": "Least popular",
  "vote_average.desc": "Highest rated",
  "primary_release_date.desc": "Newest first",
  "primary_release_date.asc": "Oldest first",
};

// Controlled and presentation only. Home redesign (RF-18, RF-20): the label is
// visually hidden but still a real <label>; the native arrow is replaced by a
// decorative chevron; the control is 48px high (44px from `lg`) with 16px text.
export function SortFilter({ value, onChange }: SortFilterProps) {
  const id = useId();

  return (
    <div className="relative lg:w-(--size-sort)">
      <label htmlFor={id} className="sr-only">
        Sort by
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(event) =>
          // The only non-empty values rendered are SORT_OPTIONS entries.
          onChange(
            SORT_OPTIONS.find((option) => option === event.target.value) ?? null
          )
        }
        className="h-(--size-control-touch) w-full appearance-none rounded-sm border border-border-strong bg-background py-2 pl-4 pr-12 text-base text-foreground lg:h-(--size-control)"
      >
        <option value="">Default order</option>
        {SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {SORT_LABELS[option]}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  );
}
