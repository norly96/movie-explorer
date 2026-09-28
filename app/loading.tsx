import { MovieCardSkeleton } from "../components/MovieCardSkeleton";

// Next.js file convention: auto-wraps page.tsx in a Suspense boundary,
// shown while the async Server Component's data fetch is pending
// (RF-6). Same grid layout as MovieGrid so nothing shifts on swap.
const SKELETON_COUNT = 20; // RF-1: up to 20 movies

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <MovieCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
