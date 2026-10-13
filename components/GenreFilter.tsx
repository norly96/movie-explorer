import { useId } from "react";
import type { Genre } from "../services/schemas/genre-schema";

export interface GenreFilterProps {
  genres: Genre[]; // [] → renders nothing (RF-21, plan.md D14)
  value: number | null;
  onChange: (genreId: number | null) => void;
}

// Controlled and presentation only. Hidden entirely when the genre list
// is unavailable instead of shown disabled (D14); the other filters and
// the search stay usable.
export function GenreFilter({ genres, value, onChange }: GenreFilterProps) {
  const id = useId();

  if (genres.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-muted">
        Genre
      </label>
      <select
        id={id}
        value={value === null ? "" : String(value)}
        onChange={(event) =>
          onChange(event.target.value === "" ? null : Number(event.target.value))
        }
        className="rounded-sm border border-border-strong bg-surface px-4 py-2 text-base text-foreground"
      >
        <option value="">All genres</option>
        {genres.map((genre) => (
          <option key={genre.id} value={genre.id}>
            {genre.name}
          </option>
        ))}
      </select>
    </div>
  );
}
