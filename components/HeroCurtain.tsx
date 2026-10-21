"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type TransitionEvent,
} from "react";

export interface HeroCurtainProps {
  open: boolean;
  // Called when the curtain has finished moving, or at once when it does not
  // move (reduced motion). Never on the first render, and never when there is
  // no content to move.
  onSettled?: () => void;
  // Where focus goes if it was inside the content when it closed (RF-13): the
  // search field.
  focusOnClose?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

// If the browser never reports the end of the transition (an interrupted one, a
// background tab), settling is still reported a little after it should have
// ended: the curtain lasts 400 ms.
const SETTLE_FALLBACK_MS = 600;

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// The open/closed wrapper of the home's hero (home-redesign RF-9, RF-12, RF-13).
//
// Open, it shows its content. Closed, the content is inert and hidden from
// assistive technology at once, and focus that was inside goes to `focusOnClose`.
// The change is a curtain: the height rolls up (a grid row going from 1fr to 0fr,
// which animates a height that is not known in advance) while the content fades
// and moves up; the transitions are in globals.css (`.hero-curtain`) and are off
// with reduced motion. It is the documented exception to animating only
// transform and opacity: it only happens after a visitor's action.
//
// It does not animate on the first render. Content that arrives later (the hero
// of a page opened with filters, once they are cleared) mounts collapsed and opens
// one frame later, so it uses the same curtain instead of popping in.
export function HeroCurtain({
  open,
  onSettled,
  focusOnClose,
  children,
}: HeroCurtainProps) {
  const hasContent = children !== null && children !== undefined && children !== false;

  const [expanded, setExpanded] = useState(open && hasContent);
  const [hadContent, setHadContent] = useState(hasContent);
  if (hadContent !== hasContent) {
    setHadContent(hasContent);
    if (!hasContent) setExpanded(false);
  }

  const wrapperRef = useRef<HTMLDivElement>(null);
  const onSettledRef = useRef(onSettled);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousExpanded = useRef(expanded);
  useEffect(() => {
    onSettledRef.current = onSettled;
  });

  // The visual state follows `open` one frame later, so that content that has
  // just mounted is painted collapsed first and then opens.
  useEffect(() => {
    if (!hasContent) return;
    const frame = requestAnimationFrame(() => setExpanded(open));
    return () => cancelAnimationFrame(frame);
  }, [open, hasContent]);

  // Focus inside the content when it closes goes to the search field. Done
  // before the browser repaints, while the focused element is still known.
  useLayoutEffect(() => {
    if (open) return;
    const wrapper = wrapperRef.current;
    if (wrapper && wrapper.contains(document.activeElement)) {
      focusOnClose?.current?.focus();
    }
  }, [open, focusOnClose]);

  function settle() {
    if (settleTimer.current !== null) {
      clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
    onSettledRef.current?.();
  }

  // Report the end of every movement, not the first render: at once without
  // animation, otherwise when the height's transition ends (or a little after
  // that, if the browser never says so).
  useEffect(() => {
    if (previousExpanded.current === expanded) return;
    previousExpanded.current = expanded;
    if (!hasContent) return;

    if (prefersReducedMotion()) {
      settle();
      return;
    }
    settleTimer.current = setTimeout(settle, SETTLE_FALLBACK_MS);
    return () => {
      if (settleTimer.current !== null) {
        clearTimeout(settleTimer.current);
        settleTimer.current = null;
      }
    };
  }, [expanded, hasContent]);

  function handleTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName && event.propertyName !== "grid-template-rows") return;
    if (settleTimer.current === null) return;
    settle();
  }

  if (!hasContent) return null;

  return (
    <div
      ref={wrapperRef}
      data-slot="hero-curtain"
      inert={!open}
      aria-hidden={open ? undefined : true}
      onTransitionEnd={handleTransitionEnd}
      className={`hero-curtain grid ${expanded ? "opacity-100" : "opacity-0"}`}
      style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
    >
      <div
        className={`min-h-0 overflow-hidden ${expanded ? "translate-y-0" : "-translate-y-8"}`}
      >
        {children}
      </div>
    </div>
  );
}
