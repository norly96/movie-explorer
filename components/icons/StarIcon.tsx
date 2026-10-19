export interface StarIconProps {
  // design.md → Icons: 16 (inline with text-sm), 20 (default), 24.
  size?: 16 | 20 | 24;
  // The rating shows the star filled with the accent color (design.md →
  // RatingBadge); everywhere else it is an outline.
  filled?: boolean;
  className?: string;
}

// Decorative only (design.md): the text next to it carries the meaning.
export function StarIcon({ size = 20, filled = false, className }: StarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <polygon points="12 3.5 14.6 9 20.5 9.7 16.1 13.7 17.3 19.5 12 16.6 6.7 19.5 7.9 13.7 3.5 9.7 9.4 9" />
    </svg>
  );
}
