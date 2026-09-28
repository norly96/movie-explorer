export interface RatingBadgeProps {
  rating: number | null;
}

// Presentation only. Icon deferred: design.md calls for a StarIcon
// here, but no task in tasks.md authorizes a new components/icons/
// file yet.
export function RatingBadge({ rating }: RatingBadgeProps) {
  if (rating === null) {
    return <span className="text-sm text-subtle">No rating</span>;
  }

  const formatted = rating.toFixed(1);

  return (
    <span
      className="text-sm font-semibold text-accent tabular-nums"
      aria-label={`Rated ${formatted} out of 10`}
    >
      {formatted}
    </span>
  );
}
