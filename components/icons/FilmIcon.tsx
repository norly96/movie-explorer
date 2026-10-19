export interface FilmIconProps {
  // design.md → Icons: 16 (inline with text-sm), 20 (default), 24.
  size?: 16 | 20 | 24;
  className?: string;
}

// Decorative only (design.md): the text or the poster frame around it says
// what is missing.
export function FilmIcon({ size = 20, className }: FilmIconProps) {
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
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M7.5 4.5v15M16.5 4.5v15" />
      <path d="M3.5 9h4M3.5 12h4M3.5 15h4M16.5 9h4M16.5 12h4M16.5 15h4" />
    </svg>
  );
}
