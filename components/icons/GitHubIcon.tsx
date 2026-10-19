export interface GitHubIconProps {
  // design.md → Icons: 16 (inline with text-sm), 20 (default), 24.
  size?: 16 | 20 | 24;
  className?: string;
}

// Decorative only (design.md): the link around it says where it goes.
// A stand-in from the design canvas, to be replaced by the author's own icon.
export function GitHubIcon({ size = 20, className }: GitHubIconProps) {
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
      <path d="M9 19c-4 1.2-4-2-6-2.5M15 21v-3.2c0-1 .1-1.5-.5-2.1 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.4 2.8 5.3 3.1 5.3 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 3.9 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2.1V21" />
    </svg>
  );
}
