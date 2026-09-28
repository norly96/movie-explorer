import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { MovieGrid } from "../components/MovieGrid";
import { getPopularMovies } from "../services/tmdb-service";
import { resolveViewState } from "./resolve-view-state";

export default async function Home() {
  const result = await getPopularMovies();
  const viewState = resolveViewState(result);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">
      {viewState.kind === "empty" && <EmptyState />}
      {viewState.kind === "error" && (
        <ErrorState message={viewState.message} />
      )}
      {viewState.kind === "grid" && <MovieGrid movies={viewState.movies} />}
    </main>
  );
}
