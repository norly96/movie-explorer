import Link from "next/link";

// Next.js file convention: rendered when notFound() is called from
// page.tsx, for a movie id that doesn't exist in TMDB or isn't
// syntactically valid (RF-9) — distinct from ErrorState, which
// handles infrastructure failures (RF-10).
export default function NotFound() {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-4 py-16 text-center"
    >
      <p className="text-sm text-foreground">Movie not found</p>
      <Link
        href="/"
        className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-foreground"
      >
        Back to home
      </Link>
    </div>
  );
}
