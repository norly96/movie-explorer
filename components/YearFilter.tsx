import { useId } from "react";
import { MIN_YEAR, getMaxYear } from "../app/explore-params";
import { ChevronDownIcon } from "./icons/ChevronDownIcon";

export interface YearFilterProps {
  value: number | null;
  onChange: (year: number | null) => void;
}

// Controlled and presentation only. A bounded <select> can't produce an
// invalid year through the UI (plan.md D6); the bounds are the same ones
// parseExploreParams accepts, so every valid URL year has an option.
// Home redesign (RF-18, RF-20): the label is visually hidden but still a real
// <label>; a decorative chevron replaces the native arrow; the control is 48px
// high (44px from `lg`) with 16px text.
export function YearFilter({ value, onChange }: YearFilterProps) {
  const id = useId();
  const maxYear = getMaxYear();
  const years = Array.from(
    { length: maxYear - MIN_YEAR + 1 },
    (_, index) => maxYear - index
  );

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        Year
      </label>
      <select
        id={id}
        value={value === null ? "" : String(value)}
        onChange={(event) =>
          onChange(event.target.value === "" ? null : Number(event.target.value))
        }
        className="h-(--size-control-touch) w-full appearance-none rounded-sm border border-border-strong bg-background py-2 pl-4 pr-12 text-base text-foreground tabular-nums lg:h-(--size-control)"
      >
        <option value="">All years</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  );
}
