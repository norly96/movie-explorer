import { act, render } from "@testing-library/react";
import { createElement, createRef, type RefObject } from "react";
import { describe, expect, it } from "vitest";
import { MockIntersectionObserver } from "../mocks/intersection-observer";
import { useBackToTopVisibility } from "./useBackToTopVisibility";

// home-redesign RF-24: the back-to-top button shows once a sentinel placed about
// 300 px below the search and filters bar has scrolled above the viewport. An
// IntersectionObserver reports it, with no scroll listener.
function Probe({ sentinel }: { sentinel: RefObject<HTMLDivElement | null> }) {
  const visible = useBackToTopVisibility(sentinel);
  return createElement(
    "div",
    null,
    createElement("div", { ref: sentinel, "data-testid": "sentinel" }),
    createElement("output", { "data-testid": "visible" }, String(visible))
  );
}

function renderProbe() {
  const view = render(
    createElement(Probe, { sentinel: createRef<HTMLDivElement>() })
  );
  const sentinel = view.getByTestId("sentinel");
  const read = () => view.getByTestId("visible").textContent;
  return { ...view, sentinel, read };
}

// Reports the sentinel as not intersecting, either above the viewport (the
// visitor has scrolled past it) or below it (not reached yet).
function report(sentinel: Element, where: "above" | "below" | "inside") {
  sentinel.getBoundingClientRect = () =>
    ({ top: where === "above" ? -120 : where === "below" ? 900 : 100 }) as DOMRect;
  act(() => {
    MockIntersectionObserver.instances.forEach((o) =>
      o.trigger(where === "inside")
    );
  });
}

describe("useBackToTopVisibility", () => {
  it("is false at first", () => {
    const { read } = renderProbe();

    expect(read()).toBe("false");
  });

  it("observes the element the reference points at", () => {
    const { sentinel } = renderProbe();

    const [observer] = MockIntersectionObserver.instances;
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(observer.observed.has(sentinel)).toBe(true);
  });

  it("becomes true when the sentinel is above the viewport", () => {
    const { sentinel, read } = renderProbe();

    report(sentinel, "above");

    expect(read()).toBe("true");
  });

  it("returns to false when the sentinel comes back into view", () => {
    const { sentinel, read } = renderProbe();

    report(sentinel, "above");
    report(sentinel, "inside");

    expect(read()).toBe("false");
  });

  it("stays false while the sentinel is still below the viewport", () => {
    const { sentinel, read } = renderProbe();

    report(sentinel, "below");

    expect(read()).toBe("false");
  });

  it("disconnects its observer on unmount", () => {
    const { unmount } = renderProbe();
    const [observer] = MockIntersectionObserver.instances;

    unmount();

    expect(observer.disconnected).toBe(true);
  });
});
