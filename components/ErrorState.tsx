import Link from "next/link";

export interface ErrorStateProps {
  message?: string;
}

const DEFAULT_MESSAGE =
  "Couldn't load popular movies. Check your connection and try again.";

// Presentation only. "Try again" is a plain link back to "/" rather
// than an onClick handler, so this stays a Server Component — no
// client state needed (plan.md: "Server-side is the default"). Icon
// deferred: design.md calls for an AlertIcon here, but no task in
// tasks.md authorizes a new components/icons/ file yet.
export function ErrorState({ message = DEFAULT_MESSAGE }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 py-16 text-center"
    >
      <p className="text-sm text-foreground">{message}</p>
      <Link
        href="/"
        className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-foreground"
      >
        Try again
      </Link>
    </div>
  );
}
