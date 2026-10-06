// Same footprint as the detail page's own layout (hero, cast,
// trailer, gallery), no data. Purely decorative while RF-11's loading
// state is shown, so it's hidden from assistive tech.
export function MovieDetailSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-12">
      <div className="space-y-4">
        <div className="aspect-video w-full animate-pulse rounded-md bg-surface-raised" />
        <div className="h-8 w-2/3 animate-pulse rounded-sm bg-surface-raised" />
        <div className="h-4 w-1/3 animate-pulse rounded-sm bg-surface-raised" />
      </div>

      <div className="flex gap-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-32 w-24 shrink-0 animate-pulse rounded-sm bg-surface-raised"
          />
        ))}
      </div>

      <div className="aspect-video w-full animate-pulse rounded-md bg-surface-raised" />

      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="aspect-video animate-pulse rounded-sm bg-surface-raised"
          />
        ))}
      </div>
    </div>
  );
}
