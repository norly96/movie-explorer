import Image from "next/image";
import type { MovieDetail } from "../services/schemas/movie-detail-schema";
import { RatingBadge } from "./RatingBadge";

export interface MovieHeroProps {
  movie: MovieDetail;
}

// Presentation only.
export function MovieHero({ movie }: MovieHeroProps) {
  return (
    <div className="space-y-4">
      {movie.backdropUrl ? (
        <div className="aspect-video w-full overflow-hidden rounded-md bg-surface-raised">
          <Image
            src={movie.backdropUrl}
            alt={`${movie.title} backdrop`}
            width={1280}
            height={720}
            sizes="100vw"
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <div className="flex gap-4">
        {movie.posterUrl ? (
          <div className="aspect-poster w-32 shrink-0 overflow-hidden rounded-sm bg-surface-raised sm:w-48">
            <Image
              src={movie.posterUrl}
              alt={`${movie.title} poster`}
              width={342}
              height={513}
              sizes="(min-width: 640px) 192px, 128px"
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            {movie.title}
          </h1>
          {movie.originalTitle ? (
            <p className="text-sm text-muted">{movie.originalTitle}</p>
          ) : null}
          {movie.tagline ? (
            <p className="text-sm text-subtle italic">{movie.tagline}</p>
          ) : null}

          <div className="flex items-center gap-3 text-sm text-muted tabular-nums">
            {movie.releaseYear ? <span>{movie.releaseYear}</span> : null}
            {movie.runtimeMinutes ? (
              <span>{movie.runtimeMinutes} min</span>
            ) : null}
            <RatingBadge rating={movie.rating} />
          </div>

          {movie.genres.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {movie.genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-sm bg-surface px-2 py-1 text-xs text-muted"
                >
                  {genre}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
