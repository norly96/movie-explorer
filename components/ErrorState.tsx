import Link from "next/link";
import { AlertIcon } from "./icons/AlertIcon";

export interface ErrorStateProps {
  message?: string;
  retryHref?: string;
  // Takes precedence over retryHref (plan.md D9): for client-side
  // retries (RF-14) that must re-trigger a query instead of navigating.
  onRetry?: () => void;
}

export const DEFAULT_MESSAGE =
  "Couldn't load popular movies. Check your connection and try again.";

// Presentation only. "Try again" is a plain link by default rather than
// an onClick handler, so Spec 1/2's usages stay Server Components — no
// client state needed (plan.md: "Server-side is the default"). Passing
// onRetry swaps it for a button, which only client callers use. Defaults to
// "/" (Spec 1's usage); the movie detail page (Spec 2) passes its own
// retryHref so "Try again" reloads the same movie instead of going
// home. The AlertIcon is decorative: the message says what failed
// (design.md → ErrorState).
export function ErrorState({
  message = DEFAULT_MESSAGE,
  retryHref = "/",
  onRetry,
}: ErrorStateProps) {
  const retryClassName =
    "rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-foreground";

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 py-16 text-center"
    >
      <AlertIcon size={24} className="text-danger" />
      <p className="text-sm text-foreground">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className={retryClassName}>
          Try again
        </button>
      ) : (
        <Link href={retryHref} className={retryClassName}>
          Try again
        </Link>
      )}
    </div>
  );
}
