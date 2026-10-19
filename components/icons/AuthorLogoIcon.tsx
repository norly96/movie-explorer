export interface AuthorLogoIconProps {
  // design.md → Icons: 16 (inline with text-sm), 20 (default), 24.
  size?: 16 | 20 | 24;
  className?: string;
}

// Decorative only (design.md): the link around it says where it goes.
// A stand-in from the design canvas, to be replaced by the author's own mark.
export function AuthorLogoIcon({ size = 20, className }: AuthorLogoIconProps) {
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
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M9.5 9.5v5M9.5 9.5h3a1.6 1.6 0 0 1 0 3.2h-3M9.5 12.7h3.4a1.6 1.6 0 0 1 0 3.2H9.5" />
    </svg>
  );
}
