import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./useDebouncedValue";

const DELAY = 300;

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("a", DELAY));

    expect(result.current).toBe("a");
  });

  it("does not change before the delay has elapsed (RF-6)", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, DELAY),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "ab" });
    act(() => {
      vi.advanceTimersByTime(DELAY - 1);
    });

    expect(result.current).toBe("a");
  });

  it("changes once the delay has elapsed since the last input change (RF-6)", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, DELAY),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "ab" });
    act(() => {
      vi.advanceTimersByTime(DELAY);
    });

    expect(result.current).toBe("ab");
  });

  it("resets the timer on a new input change instead of stacking it", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, DELAY),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "ab" });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ value: "abc" });

    // 200 + 299ms: the first change's timer would have fired at 300ms
    // if it had been stacked instead of reset.
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("abc");
  });

  it("never exposes the intermediate value of rapid changes", () => {
    const seen: string[] = [];
    const { result, rerender } = renderHook(
      ({ value }) => {
        const debounced = useDebouncedValue(value, DELAY);
        seen.push(debounced);
        return debounced;
      },
      { initialProps: { value: "a" } }
    );

    rerender({ value: "ab" });
    rerender({ value: "abc" });
    act(() => {
      vi.advanceTimersByTime(DELAY);
    });

    expect(result.current).toBe("abc");
    expect(seen).not.toContain("ab");
  });

  it("clears the pending timer on unmount", () => {
    const { rerender, unmount } = renderHook(
      ({ value }) => useDebouncedValue(value, DELAY),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "ab" });
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
