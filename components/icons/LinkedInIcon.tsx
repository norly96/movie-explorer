export interface LinkedInIconProps {
  // design.md → Icons: 16 (inline with text-sm), 20 (default), 24.
  size?: 16 | 20 | 24;
  className?: string;
}

// Decorative only (design.md): the link around it says where it goes.
// A stand-in from the design canvas, to be replaced by the author's own icon.
export function LinkedInIcon({ size = 20, className }: LinkedInIconProps) {
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
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 10.5V17M8 7.4v.1M12 17v-6.5M12 13.5a3 3 0 0 1 6 0V17" />
    </svg>
  );
}
