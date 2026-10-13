import { useId } from "react";
import { MIN_YEAR, getMaxYear } from "../app/explore-params";

export interface YearFilterProps {
  value: number | null;
  onChange: (year: number | null) => void;
}

// Controlled and presentation only. A bounded <select> can't produce an
// invalid year through the UI (plan.md D6); the bounds are the same ones
// parseExploreParams accepts, so every valid URL year has an option.
export function YearFilter({ value, onChange }: YearFilterProps) {
  const id = useId();
  const maxYear = getMaxYear();
  const years = Array.from(
    { length: maxYear - MIN_YEAR + 1 },
    (_, index) => maxYear - index
  );

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-muted">
        Year
      </label>
      <select
        id={id}
        value={value === null ? "" : String(value)}
        onChange={(event) =>
          onChange(event.target.value === "" ? null : Number(event.target.value))
        }
        className="rounded-sm border border-border-strong bg-surface px-4 py-2 text-base text-foreground tabular-nums"
      >
        <option value="">All years</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}
