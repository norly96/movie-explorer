import { useEffect, useRef, type RefObject } from "react";

// Fires before the sentinel is fully on screen, so the next page starts
// loading while the visitor is still near the bottom (RF-11).
const ROOT_MARGIN = "400px";

export function useInfiniteScrollTrigger(
  onIntersect: () => void,
  enabled: boolean
): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);

  // Keep the latest callback without making it an effect dependency, so
  // a new function identity each render doesn't recreate the observer.
  const onIntersectRef = useRef(onIntersect);
  useEffect(() => {
    onIntersectRef.current = onIntersect;
  });

  // `enabled` is a dependency on purpose: re-observing after it goes
  // false → true makes the browser report the sentinel's current state,
  // so a sentinel still in view after a page loads triggers the next one.
  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onIntersectRef.current();
        }
      },
      { rootMargin: ROOT_MARGIN }
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [enabled]);

  return ref;
}
