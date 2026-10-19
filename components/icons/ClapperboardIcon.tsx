export interface ClapperboardIconProps {
  // design.md → Icons: 16 (inline with text-sm), 20 (default), 24; and 28,
  // the header's logo (design.md → Named sizes, `size-brand-icon`).
  size?: 16 | 20 | 24 | 28;
  className?: string;
}

// Decorative only (design.md): the site name next to it, or the link around
// it, carries the name.
export function ClapperboardIcon({ size = 20, className }: ClapperboardIconProps) {
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
      <path d="M3.5 9.5h17v10a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" />
      <path d="M3.5 9.5L3 6l17-3 .5 3.5z" />
    </svg>
  );
}
