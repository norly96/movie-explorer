import { useId, type Ref } from "react";
import { SearchIcon } from "./icons/SearchIcon";

export interface SearchInputProps {
  value: string;
  onChange: (query: string) => void;
  // Lets the owner move focus to the field (the hero does when it hides, RF-13).
  inputRef?: Ref<HTMLInputElement>;
}

// Controlled and presentation only. Debouncing (RF-6) is
// useDebouncedValue's job, so every keystroke is reported as-is.
//
// Home redesign (RF-18, RF-20): the label is visually hidden but stays a real
// <label> that names the field, and the field is as high as the bar's other
// controls (48px on phones, 44px from `lg`) with 16px text so phone browsers do
// not zoom in on focus.
export function SearchInput({ value, onChange, inputRef }: SearchInputProps) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        Search movies
      </label>
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-subtle"
        />
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="search"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search by title"
          className="h-(--size-control-touch) w-full rounded-sm border border-border-strong bg-surface py-2 pl-12 pr-4 text-base text-foreground placeholder:text-subtle lg:h-(--size-control)"
        />
      </div>
    </div>
  );
}
