export interface EmptyStateProps {
  message?: string;
}

const DEFAULT_MESSAGE = "No movies found";

// Presentation only — no data fetching. Icon deferred: design.md calls
// for a FilmIcon here, but no task in tasks.md authorizes a new
// components/icons/ file yet.
export function EmptyState({ message = DEFAULT_MESSAGE }: EmptyStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-2 py-16 text-center"
    >
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
