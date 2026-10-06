import type { MovieDetail } from "../services/schemas/movie-detail-schema";

export interface MovieInfoProps {
  movie: MovieDetail;
}

// Presentation only. status/originalLanguage are always present on
// MovieDetail (TMDB always returns them), so only overview and
// homepageUrl need the RF-6 "omit when absent" treatment.
export function MovieInfo({ movie }: MovieInfoProps) {
  return (
    <div className="max-w-prose space-y-4">
      {movie.overview ? (
        <p className="text-base text-foreground">{movie.overview}</p>
      ) : null}

      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
        <div className="flex gap-2">
          <dt className="text-subtle">Status</dt>
          <dd>{movie.status}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-subtle">Language</dt>
          <dd>{movie.originalLanguage}</dd>
        </div>
        {movie.homepageUrl ? (
          <div className="flex gap-2">
            <dt className="text-subtle">Website</dt>
            <dd>
              <a
                href={movie.homepageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline"
              >
                Official site
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
