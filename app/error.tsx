"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Safety net for *unexpected* exceptions (bugs) — distinct from the
// handled TMDB failure path, which renders ErrorState inline instead
// of replacing the whole page (see plan.md decision #1).
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 py-16 text-center"
    >
      <p className="text-sm text-foreground">
        Something went wrong. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-foreground"
      >
        Try again
      </button>
    </div>
  );
}
