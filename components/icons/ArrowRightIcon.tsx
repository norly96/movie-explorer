export interface ArrowRightIconProps {
  // design.md → Icons: 16 (inline with text-sm), 20 (default), 24.
  size?: 16 | 20 | 24;
  className?: string;
}

// Decorative only (design.md): the "Details" text next to it says what the link does.
export function ArrowRightIcon({ size = 20, className }: ArrowRightIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
