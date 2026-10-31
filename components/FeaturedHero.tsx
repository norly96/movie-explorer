"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import type { FeaturedMovie } from "../services/schemas/movie-schema";
import { ArrowRightIcon } from "./icons/ArrowRightIcon";
import { RatingBadge } from "./RatingBadge";

export interface FeaturedHeroProps {
  movie: FeaturedMovie;
  // The first of the movie's genres that has a name (firstGenreName); null when
  // none does, and the genre is then simply left out (RF-16).
  genreName: string | null;
}

// Presentation only (home-redesign RF-6, RF-10, RF-14 to RF-17; docs/design.md →
// FeaturedHero). A `section`, never an `article`: the featured movie is also a
// card in the grid, and must not count as a second one. Narrow: the image on top
// at 16:9 and the text below on the page background. Wide: the image fills the
// hero's area, with the vertical fade and the dark layer from the left, and the
// text column (at most its token width) over it.
//
// The image is decoration: its description is empty, because the title already
// names the movie. If it fails to load it is removed and the text stays on a
// plain background (RF-10). It loads eagerly with high priority, like the first
// posters, because it is the largest thing the page paints (RF-32).
export function FeaturedHero({ movie, genreName }: FeaturedHeroProps) {
  const titleId = useId();
  const [imageFailed, setImageFailed] = useState(false);

  const facts: string[] = [];
  if (genreName) facts.push(genreName);
  if (movie.releaseYear !== null) facts.push(String(movie.releaseYear));
  const synopsis = movie.overview.trim();

  return (
    <section aria-labelledby={titleId} className="relative">
      {!imageFailed && (
        <div
          data-slot="hero-image"
          className="hero-fade relative aspect-video lg:absolute lg:inset-0 lg:aspect-auto"
        >
          <Image
            src={movie.backdropUrl}
            alt=""
            fill
            sizes="100vw"
            loading="eager"
            fetchPriority="high"
            onError={() => setImageFailed(true)}
            className="object-cover"
          />
          <div
            aria-hidden="true"
            className="hero-scrim absolute inset-0 hidden lg:block"
          />
        </div>
      )}
      <div className="relative mx-auto flex max-w-7xl flex-col px-4 py-4 lg:min-h-(--size-hero) lg:justify-center lg:px-8">
        <div className="flex flex-col gap-2 lg:max-w-(--size-hero-text) lg:gap-3">
          <h2
            id={titleId}
            className="line-clamp-2 text-balance text-hero-sm font-semibold uppercase text-foreground lg:text-hero"
          >
            {movie.title}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted tabular-nums">
            {facts.map((fact) => (
              <span key={fact} className="flex items-center gap-2">
                {fact}
                <span aria-hidden="true">·</span>
              </span>
            ))}
            <RatingBadge rating={movie.rating} />
          </div>
          {synopsis !== "" && (
            <p className="line-clamp-3 text-base text-foreground">{synopsis}</p>
          )}
          <Link
            href={`/movie/${movie.id}`}
            aria-label={`Details of ${movie.title}`}
            className="mt-2 inline-flex h-(--size-control-touch) w-full items-center justify-center gap-2 rounded-md border-2 border-transparent bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors duration-(--duration-fast) ease-out hover:bg-accent-hover lg:mt-0 lg:h-(--size-control) lg:w-auto lg:self-start"
          >
            Details
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}
