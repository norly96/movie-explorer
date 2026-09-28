import type { Movie } from "../services/schemas/movie-schema";
import { MovieCard } from "./MovieCard";

export interface MovieGridProps {
  movies: Movie[]; // always non-empty when rendered — see resolve-view-state.ts
}

export function MovieGrid({ movies }: MovieGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  );
}
