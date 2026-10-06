import { MovieDetailSkeleton } from "../../../components/MovieDetailSkeleton";

// Next.js file convention: auto-wraps page.tsx in a Suspense
// boundary, shown while getMovieDetails() is pending (RF-11). A
// dedicated skeleton matching this page's own layout — not Spec 1's
// grid skeleton.
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">
      <MovieDetailSkeleton />
    </div>
  );
}
