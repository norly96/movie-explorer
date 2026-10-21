import Image from "next/image";
import Link from "next/link";
import type { Movie } from "../services/schemas/movie-schema";
import { FilmIcon } from "./icons/FilmIcon";
import { RatingBadge } from "./RatingBadge";

export interface MovieCardProps {
  movie: Movie;
  // For the posters that decide the first paint (home-redesign RF-32): loaded
  // eagerly with high fetch priority. Next 16 deprecated next/image's own
  // `priority`; with several possible largest images its docs recommend this
  // pair instead of `preload`.
  priority?: boolean;
}

// Presentation only. Wrapped in a Link to the movie's detail page
// (Spec 2, RF-7) — the <article> itself is unchanged so Spec 1's own
// tests and MovieGrid.test.tsx's getAllByRole("article") still pass.
//
// The transparent 2px border is reserved at rest so that the hover (a gold
// border, home-redesign RF-23) adds no layout shift; the skeleton has the same.
// On pointers that can hover (Tailwind's `hover:` only applies there) the card
// also enlarges by the scale token, only where motion is allowed, and is raised
// above its neighbors so it is never covered; the title takes the accent color.
// Keyboard focus keeps the global outline and does not enlarge the card.
// A missing poster is the same 2:3 surface with a decorative film icon, never a
// broken image (design.md → Posters).
export function MovieCard({ movie, priority = false }: MovieCardProps) {
  return (
    <Link href={`/movie/${movie.id}`} className="group">
      <article className="relative overflow-hidden rounded-md border-2 border-transparent transition-[border-color,scale] duration-(--duration-fast) ease-out hover:z-10 hover:border-accent motion-safe:hover:scale-(--scale-card-hover)">
        <div className="flex aspect-poster items-center justify-center overflow-hidden rounded-sm bg-surface-raised">
          {movie.posterUrl ? (
            <Image
              src={movie.posterUrl}
              alt={movie.title}
              width={342}
              height={513}
              sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
              loading={priority ? "eager" : undefined}
              fetchPriority={priority ? "high" : undefined}
              className="h-full w-full object-cover"
            />
          ) : (
            <FilmIcon size={24} className="text-subtle" />
          )}
        </div>
        <div className="space-y-1 p-3">
          <h3 className="line-clamp-2 text-sm text-foreground transition-colors duration-(--duration-fast) ease-out group-hover:text-accent">
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
