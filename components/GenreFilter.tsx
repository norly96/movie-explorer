import { useId } from "react";
import type { Genre } from "../services/schemas/genre-schema";
import { ChevronDownIcon } from "./icons/ChevronDownIcon";

export interface GenreFilterProps {
  genres: Genre[]; // [] → renders nothing (RF-21, plan.md D14)
  value: number | null;
  onChange: (genreId: number | null) => void;
}

// Controlled and presentation only. Hidden entirely when the genre list
// is unavailable instead of shown disabled (D14); the other filters and
// the search stay usable.
// Home redesign (RF-18, RF-20): the label is visually hidden but still a real
// <label>; a decorative chevron replaces the native arrow; the control is 48px
// high (44px from `lg`) with 16px text.
export function GenreFilter({ genres, value, onChange }: GenreFilterProps) {
  const id = useId();

  if (genres.length === 0) return null;

  return (
    <div className="relative lg:w-(--size-genre)">
      <label htmlFor={id} className="sr-only">
        Genre
      </label>
      <select
        id={id}
        value={value === null ? "" : String(value)}
        onChange={(event) =>
          onChange(event.target.value === "" ? null : Number(event.target.value))
        }
        className="h-(--size-control-touch) w-full appearance-none rounded-sm border border-border-strong bg-background py-2 pl-4 pr-12 text-base text-foreground lg:h-(--size-control)"
      >
        <option value="">All genres</option>
        {genres.map((genre) => (
          <option key={genre.id} value={genre.id}>
            {genre.name}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  );
}
