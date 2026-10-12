export interface InlinePageErrorProps {
  onRetry: () => void;
}

// Presentation only. Small inline error for a failed additional page
// (RF-15); the full-page ErrorState stays for first-page failures
// (plan.md D10). Icon deferred, same as ErrorState: no task authorizes
// AlertIcon yet.
export function InlinePageError({ onRetry }: InlinePageErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 py-8 text-center"
    >
      <p className="text-sm text-foreground">
        Couldn&apos;t load more movies. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-foreground"
      >
        Try again
      </button>
    </div>
  );
}
