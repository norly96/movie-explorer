import { useEffect, useState } from "react";

// Written in-house rather than pulling in a dependency (plan.md D17).
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    // Cleanup resets the timer on every change (and on unmount), so
    // timers never stack.
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
