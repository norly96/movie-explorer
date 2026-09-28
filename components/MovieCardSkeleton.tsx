// Same footprint as MovieCard (poster, title, metadata), no data.
// Purely decorative while RF-6's loading state is shown, so it's
// hidden from assistive tech.
export function MovieCardSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-md">
      <div className="aspect-poster animate-pulse rounded-sm bg-surface-raised" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-3/4 animate-pulse rounded-sm bg-surface-raised" />
        <div className="h-4 w-1/3 animate-pulse rounded-sm bg-surface-raised" />
      </div>
    </div>
  );
}
