import Image from "next/image";
import Link from "next/link";
import type { Movie } from "../services/schemas/movie-schema";
import { RatingBadge } from "./RatingBadge";

export interface MovieCardProps {
  movie: Movie;
}

// Presentation only. Wrapped in a Link to the movie's detail page
// (Spec 2, RF-7) — the <article> itself is unchanged so Spec 1's own
// tests and MovieGrid.test.tsx's getAllByRole("article") still pass.
export function MovieCard({ movie }: MovieCardProps) {
  return (
    <Link href={`/movie/${movie.id}`}>
      <article className="overflow-hidden rounded-md">
        <div className="aspect-poster overflow-hidden rounded-sm bg-surface-raised">
          {movie.posterUrl ? (
            <Image
              src={movie.posterUrl}
              alt={movie.title}
              width={342}
              height={513}
              sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="space-y-1 p-3">
          <h3 className="line-clamp-2 text-sm text-foreground">
            {movie.title}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted tabular-nums">
              {movie.releaseYear ?? ""}
            </span>
            <RatingBadge rating={movie.rating} />
          </div>
        </div>
      </article>
    </Link>
  );
}
