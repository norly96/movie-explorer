import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeroCurtain } from "./HeroCurtain";

function wrapper(container: HTMLElement) {
  return container.querySelector('[data-slot="hero-curtain"]') as HTMLElement | null;
}

const rows = (container: HTMLElement) => wrapper(container)!.style.gridTemplateRows;

function reduceMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query === "(prefers-reduced-motion: reduce)",
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// home-redesign RF-9, RF-12, RF-13: the open/closed wrapper of the hero.
describe("HeroCurtain content (RF-9)", () => {
  it("renders nothing at all when there is no content", () => {
    const { container, rerender } = render(<HeroCurtain open>{null}</HeroCurtain>);
    expect(container).toBeEmptyDOMElement();

    rerender(<HeroCurtain open>{false}</HeroCurtain>);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows its content, open and reachable, when open", () => {
    const { container } = render(
      <HeroCurtain open>
        <button type="button">Details</button>
      </HeroCurtain>
    );

    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
    expect(wrapper(container)).not.toHaveAttribute("inert");
    expect(wrapper(container)).not.toHaveAttribute("aria-hidden");
    expect(rows(container)).toBe("1fr");
  });
});

describe("HeroCurtain closed (RF-13)", () => {
  it("makes its content inert and hidden from assistive technology", () => {
    const { container } = render(
      <HeroCurtain open={false}>
        <button type="button">Details</button>
      </HeroCurtain>
    );

    expect(wrapper(container)).toHaveAttribute("inert");
    expect(wrapper(container)).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("button", { name: "Details" })).not.toBeInTheDocument();
  });

  it("applies that as soon as it is told to close, before the curtain has moved", () => {
    const { container, rerender } = render(
      <HeroCurtain open>
        <button type="button">Details</button>
      </HeroCurtain>
    );

    rerender(
      <HeroCurtain open={false}>
        <button type="button">Details</button>
      </HeroCurtain>
    );

    expect(wrapper(container)).toHaveAttribute("inert");
    expect(wrapper(container)).toHaveAttribute("aria-hidden", "true");
  });

  it("moves focus that was inside to the element it was given", () => {
    const search = createRef<HTMLInputElement>();
    const tree = (open: boolean) => (
      <>
        <input ref={search} aria-label="Search" />
        <HeroCurtain open={open} focusOnClose={search}>
          <button type="button">Details</button>
        </HeroCurtain>
      </>
    );
    const { rerender } = render(tree(true));
    screen.getByRole("button", { name: "Details" }).focus();

    rerender(tree(false));

    expect(search.current).toHaveFocus();
  });

  it("leaves focus alone when it was somewhere else", () => {
    const search = createRef<HTMLInputElement>();
    const other = createRef<HTMLButtonElement>();
    const tree = (open: boolean) => (
      <>
        <input ref={search} aria-label="Search" />
        <button ref={other}>Other</button>
        <HeroCurtain open={open} focusOnClose={search}>
          <button type="button">Details</button>
        </HeroCurtain>
      </>
    );
    const { rerender } = render(tree(true));
    other.current!.focus();

    rerender(tree(false));

    expect(other.current).toHaveFocus();
  });
});

describe("HeroCurtain late data (RF-7, RF-12)", () => {
  it("is open at once when the content is there from the first render", () => {
    const { container } = render(
      <HeroCurtain open>
        <p>Hero</p>
      </HeroCurtain>
    );

    expect(rows(container)).toBe("1fr");
  });

  it("mounts collapsed when the content arrives later, and opens a frame after", async () => {
    const { container, rerender } = render(<HeroCurtain open>{null}</HeroCurtain>);

    rerender(
      <HeroCurtain open>
        <p>Hero</p>
      </HeroCurtain>
    );

    expect(screen.getByText("Hero")).toBeInTheDocument();
    expect(rows(container)).toBe("0fr");
    await waitFor(() => expect(rows(container)).toBe("1fr"));
  });

  it("stays closed when the content arrives while it is told to stay closed", async () => {
    const { container, rerender } = render(<HeroCurtain open={false}>{null}</HeroCurtain>);

    rerender(
      <HeroCurtain open={false}>
        <p>Hero</p>
      </HeroCurtain>
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(rows(container)).toBe("0fr");
  });
});

describe("HeroCurtain settling (RF-12)", () => {
  function setup(open: boolean, onSettled: () => void) {
    const tree = (isOpen: boolean) => (
      <HeroCurtain open={isOpen} onSettled={onSettled}>
        <p>Hero</p>
      </HeroCurtain>
    );
    const view = render(tree(open));
    return { ...view, set: (isOpen: boolean) => view.rerender(tree(isOpen)) };
  }

  it("does not call back on the first render", () => {
    const onSettled = vi.fn();
    setup(true, onSettled);

    expect(onSettled).not.toHaveBeenCalled();
  });

  it("calls back when the curtain ends after closing, once", async () => {
    reduceMotion(false);
    const onSettled = vi.fn();
    const { container, set } = setup(true, onSettled);

    set(false);
    await waitFor(() => expect(rows(container)).toBe("0fr"));
    expect(onSettled).not.toHaveBeenCalled();

    fireEvent.transitionEnd(wrapper(container)!, { propertyName: "grid-template-rows" });
    expect(onSettled).toHaveBeenCalledTimes(1);

    fireEvent.transitionEnd(wrapper(container)!, { propertyName: "grid-template-rows" });
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it("calls back when the curtain ends after opening", async () => {
    reduceMotion(false);
    const onSettled = vi.fn();
    const { container, set } = setup(false, onSettled);

    set(true);
    await waitFor(() => expect(rows(container)).toBe("1fr"));
    fireEvent.transitionEnd(wrapper(container)!, { propertyName: "grid-template-rows" });

    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it("ignores the end of the other transitions", async () => {
    reduceMotion(false);
    const onSettled = vi.fn();
    const { container, set } = setup(true, onSettled);

    set(false);
    await waitFor(() => expect(rows(container)).toBe("0fr"));
    fireEvent.transitionEnd(wrapper(container)!, { propertyName: "opacity" });

    expect(onSettled).not.toHaveBeenCalled();
  });

  it("calls back at once when the visitor prefers reduced motion", async () => {
    reduceMotion(true);
    const onSettled = vi.fn();
    const { container, set } = setup(true, onSettled);

    set(false);

    await waitFor(() => expect(onSettled).toHaveBeenCalledTimes(1));
    expect(rows(container)).toBe("0fr");
  });

  it("calls back even if the browser never reports the end of the transition", async () => {
    reduceMotion(false);
    const onSettled = vi.fn();
    const { set } = setup(true, onSettled);

    set(false);

    await waitFor(() => expect(onSettled).toHaveBeenCalledTimes(1), { timeout: 2000 });
  });

  it("does not call back when there is no content to move", () => {
    const onSettled = vi.fn();
    const { rerender } = render(
      <HeroCurtain open onSettled={onSettled}>
        {null}
      </HeroCurtain>
    );

    rerender(
      <HeroCurtain open={false} onSettled={onSettled}>
        {null}
      </HeroCurtain>
    );

    expect(onSettled).not.toHaveBeenCalled();
  });
});
