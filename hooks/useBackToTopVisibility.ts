import { useEffect, useState, type RefObject } from "react";

// Whether the sentinel has scrolled above the viewport (home-redesign RF-24). The
// sentinel sits about 300 px below the search and filters bar, so the back-to-top
// button shows once the visitor is well past it. Observed with an
// IntersectionObserver, never a scroll listener, which would run on every scroll
// event. Not intersecting alone is not enough: a sentinel still below the
// viewport (not reached yet) must keep the button hidden, so the sentinel has to
// be above the top edge too.
export function useBackToTopVisibility(
  sentinel: RefObject<Element | null>
): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = sentinel.current;
    if (!element) return;

    const observer = new IntersectionObserver((entries) => {
      const latest = entries[entries.length - 1];
      if (!latest) return;
      setVisible(
        !latest.isIntersecting && latest.target.getBoundingClientRect().top < 0
      );
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [sentinel]);

  return visible;
}
