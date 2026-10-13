import { useId } from "react";
import { SORT_OPTIONS, type SortOption } from "../app/explore-params";

export interface SortFilterProps {
  value: SortOption | null;
  onChange: (sort: SortOption | null) => void;
}

// Record<SortOption, …> makes a new sort option a compile error until it
// gets a label here.
const SORT_LABELS: Record<SortOption, string> = {
  "popularity.desc": "Most popular",
  "popularity.asc": "Least popular",
  "vote_average.desc": "Highest rated",
  "primary_release_date.desc": "Newest first",
  "primary_release_date.asc": "Oldest first",
};

// Controlled and presentation only.
export function SortFilter({ value, onChange }: SortFilterProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-muted">
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
        className="rounded-sm border border-border-strong bg-surface px-4 py-2 text-base text-foreground"
      >
        <option value="">Default order</option>
        {SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {SORT_LABELS[option]}
          </option>
        ))}
      </select>
    </div>
  );
}
