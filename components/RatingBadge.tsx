import { StarIcon } from "./icons/StarIcon";

export interface RatingBadgeProps {
  rating: number | null;
}

// Presentation only. The star is decorative (hidden from assistive technology):
// the label on the badge says the score, and the star takes the badge's accent
// color (docs/design.md → RatingBadge).
export function RatingBadge({ rating }: RatingBadgeProps) {
  if (rating === null) {
    return <span className="text-sm text-subtle">No rating</span>;
  }

  const formatted = rating.toFixed(1);

  return (
    <span
      className="inline-flex items-center gap-1 text-sm font-semibold text-accent tabular-nums"
      aria-label={`Rated ${formatted} out of 10`}
    >
      <StarIcon size={16} filled />
      {formatted}
    </span>
  );
}
