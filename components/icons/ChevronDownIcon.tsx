export interface ChevronDownIconProps {
  // design.md → Icons: 16 (inline with text-sm), 20 (default), 24.
  size?: 16 | 20 | 24;
  className?: string;
}

// Decorative only (design.md): the selector it sits in carries the label.
export function ChevronDownIcon({ size = 20, className }: ChevronDownIconProps) {
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
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
