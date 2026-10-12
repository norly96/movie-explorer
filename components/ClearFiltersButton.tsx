export interface ClearFiltersButtonProps {
  visible: boolean;
  onClear: () => void;
}

// Presentation only. Hidden entirely when nothing is active instead of
// shown disabled (plan.md D12). Secondary variant per design.md; the
// global :focus-visible rule provides the focus ring.
export function ClearFiltersButton({
  visible,
  onClear,
}: ClearFiltersButtonProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClear}
      className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-foreground"
    >
      Clear filters
    </button>
  );
}
