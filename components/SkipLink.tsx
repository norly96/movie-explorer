// The id of the single main area of every page (the root layout declares it);
// the skip link points at it (home-redesign RF-5).
export const MAIN_CONTENT_ID = "main-content";

// First focusable element of every page, hidden until it receives focus. Colors
// and sizes come from docs/design.md; once visible it sits above everything,
// like a primary button (accent on the page's dark background).
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-foreground"
    >
      Skip to content
    </a>
  );
}
