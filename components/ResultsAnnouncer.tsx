export interface ResultsAnnouncerProps {
  text: string;
}

// Presentation only (home-redesign RF-22): a visually hidden polite live region.
// The explorer gives it the results heading's text once the first page of a
// search or filter selection has loaded with results, and an empty text
// otherwise (the empty state already announces itself, so it is not read twice).
// It never moves focus.
export function ResultsAnnouncer({ text }: ResultsAnnouncerProps) {
  if (text === "") return null;

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {text}
    </div>
  );
}
