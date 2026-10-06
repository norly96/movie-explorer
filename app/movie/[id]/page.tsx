import { notFound } from "next/navigation";
import { CastList } from "../../../components/CastList";
import { ErrorState } from "../../../components/ErrorState";
import { Gallery } from "../../../components/Gallery";
import { MovieHero } from "../../../components/MovieHero";
import { MovieInfo } from "../../../components/MovieInfo";
import { TrailerEmbed } from "../../../components/TrailerEmbed";
import { getMovieDetails } from "../../../services/movie-detail-service";

export default async function MoviePage({
  params,
}: PageProps<"/movie/[id]">) {
  const { id } = await params;
  const movieId = Number(id);

  // RF-9: a syntactically invalid id (non-numeric, zero, negative,
  // decimal) never reaches TMDB — straight to the same "not found"
  // page as a numeric id TMDB doesn't have.
  if (!Number.isInteger(movieId) || movieId <= 0) {
    notFound();
  }

  const result = await getMovieDetails(movieId);

  if (!result.ok) {
    if (result.error.reason === "not_found") {
      notFound();
    }
    // RF-10: infrastructure failure, not a missing movie. Retries
    // this same page, not home (plan.md decision #4).
    return <ErrorState retryHref={`/movie/${id}`} />;
  }

  const movie = result.data;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-12 px-4 py-8 lg:px-8">
      <MovieHero movie={movie} />
      <MovieInfo movie={movie} />
      <CastList cast={movie.cast} directors={movie.directors} />
      <TrailerEmbed trailerKey={movie.trailerKey} />
      <Gallery imageUrls={movie.galleryUrls} />
    </main>
  );
}
