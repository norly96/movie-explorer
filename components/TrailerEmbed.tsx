export interface TrailerEmbedProps {
  trailerKey: string | null;
}

// Presentation only. youtube-nocookie.com: no tracking cookie set
// until the visitor actually interacts with the player (plan.md
// decision #6). loading="lazy" mitigates the third-party-iframe
// performance risk plan.md names.
export function TrailerEmbed({ trailerKey }: TrailerEmbedProps) {
  if (!trailerKey) return null;

  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${trailerKey}`}
      title="Movie trailer"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className="aspect-video w-full rounded-md"
    />
  );
}
