// Same footprint as MovieCard (poster, title, metadata), no data.
// Purely decorative while RF-6's loading state is shown, so it's
// hidden from assistive tech. With reduced motion the pulse is switched
// off (motion-reduce), not merely shortened: an infinite animation would
// keep repeating (home-redesign RF-36). The transparent 2px border is the
// card's, so both have the same footprint.
export function MovieCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-md border-2 border-transparent"
    >
      <div className="aspect-poster animate-pulse motion-reduce:animate-none rounded-sm bg-surface-raised" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-3/4 animate-pulse motion-reduce:animate-none rounded-sm bg-surface-raised" />
        <div className="h-4 w-1/3 animate-pulse motion-reduce:animate-none rounded-sm bg-surface-raised" />
      </div>
    </div>
  );
}
