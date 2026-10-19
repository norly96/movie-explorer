import { FilmIcon } from "./icons/FilmIcon";

export interface EmptyStateProps {
  message?: string;
}

const DEFAULT_MESSAGE = "No movies found";

// Presentation only — no data fetching. The FilmIcon is decorative: the
// message says why nothing is shown (design.md → EmptyState).
export function EmptyState({ message = DEFAULT_MESSAGE }: EmptyStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-2 py-16 text-center"
    >
      <FilmIcon size={24} className="text-subtle" />
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
