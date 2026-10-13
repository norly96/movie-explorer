import { act, render } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { MockIntersectionObserver } from "../mocks/intersection-observer";
import { useInfiniteScrollTrigger } from "./useInfiniteScrollTrigger";

function Sentinel({
  onIntersect,
  enabled,
}: {
  onIntersect: () => void;
  enabled: boolean;
}) {
  const ref = useInfiniteScrollTrigger(onIntersect, enabled);
  return createElement("div", { ref, "data-testid": "sentinel" });
}

function renderSentinel(onIntersect: () => void, enabled: boolean) {
  return render(createElement(Sentinel, { onIntersect, enabled }));
}

function intersect(isIntersecting = true) {
  act(() => {
    MockIntersectionObserver.instances.forEach((o) => o.trigger(isIntersecting));
  });
}

describe("useInfiniteScrollTrigger", () => {
  it("observes the element the returned ref is attached to", () => {
    const { getByTestId } = renderSentinel(() => {}, true);

    const [observer] = MockIntersectionObserver.instances;
    expect(observer.observed.has(getByTestId("sentinel"))).toBe(true);
  });

  it("calls onIntersect when the element intersects and enabled is true (RF-11)", () => {
    const onIntersect = vi.fn();
    renderSentinel(onIntersect, true);

    intersect(true);

    expect(onIntersect).toHaveBeenCalledTimes(1);
  });

  it("does not call onIntersect when the element is not intersecting", () => {
    const onIntersect = vi.fn();
    renderSentinel(onIntersect, true);

    intersect(false);

    expect(onIntersect).not.toHaveBeenCalled();
  });

  it("does not observe nor call onIntersect when enabled is false (RF-12)", () => {
    const onIntersect = vi.fn();
    renderSentinel(onIntersect, false);

    intersect(true);

    expect(MockIntersectionObserver.instances).toHaveLength(0);
    expect(onIntersect).not.toHaveBeenCalled();
  });

  it("starts observing when enabled turns true, and stops when it turns false", () => {
    const onIntersect = vi.fn();
    const { rerender } = renderSentinel(onIntersect, false);

    rerender(createElement(Sentinel, { onIntersect, enabled: true }));
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    intersect(true);
    expect(onIntersect).toHaveBeenCalledTimes(1);

    const [observer] = MockIntersectionObserver.instances;
    rerender(createElement(Sentinel, { onIntersect, enabled: false }));
    expect(observer.disconnected).toBe(true);
  });

  it("calls the latest onIntersect without recreating the observer", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderSentinel(first, true);

    rerender(createElement(Sentinel, { onIntersect: second, enabled: true }));
    intersect(true);

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("triggers before the sentinel is fully on screen (RF-11 'near the bottom')", () => {
    renderSentinel(() => {}, true);

    const [observer] = MockIntersectionObserver.instances;
    expect(observer.rootMargin).not.toBe("0px");
  });

  it("disconnects the observer on unmount", () => {
    const { unmount } = renderSentinel(() => {}, true);
    const [observer] = MockIntersectionObserver.instances;

    unmount();

    expect(observer.disconnected).toBe(true);
  });
});
