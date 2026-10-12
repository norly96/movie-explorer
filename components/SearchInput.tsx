import { useId } from "react";
import { SearchIcon } from "./icons/SearchIcon";

export interface SearchInputProps {
  value: string;
  onChange: (query: string) => void;
}

// Controlled and presentation only. Debouncing (RF-6) is
// useDebouncedValue's job, so every keystroke is reported as-is.
export function SearchInput({ value, onChange }: SearchInputProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-muted">
        Search movies
      </label>
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-subtle"
        />
        <input
          id={id}
          type="text"
          inputMode="search"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search by title"
          className="w-full rounded-sm border border-border-strong bg-surface py-2 pl-12 pr-4 text-base text-foreground placeholder:text-subtle"
        />
      </div>
    </div>
  );
}
