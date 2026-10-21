import { ArrowUpIcon } from "./icons/ArrowUpIcon";

export interface BackToTopButtonProps {
  visible: boolean;
  onActivate: () => void;
}

// Presentation only (home-redesign RF-24, RF-26; docs/design.md →
// BackToTopButton). Icon-only, so the name lives on the button. While it is not
// shown it stays in the page, so it can fade in and rise 8px instead of popping
// in, but it is out of the keyboard's reach (tabindex -1, inert, and visibility
// hidden once the fade is done) and hidden from assistive technology. With
// reduced motion the fade and rise do not happen.
export function BackToTopButton({ visible, onActivate }: BackToTopButtonProps) {
  return (
    <button
      type="button"
      aria-label="Back to top of results"
      aria-hidden={visible ? undefined : true}
      inert={!visible}
      tabIndex={visible ? undefined : -1}
      onClick={onActivate}
      className={`fixed bottom-4 right-4 z-40 flex size-(--size-back-to-top) items-center justify-center rounded-md border border-border-strong bg-surface-raised text-foreground transition-[opacity,transform,visibility,border-color,color] duration-(--duration-appear) ease-out hover:border-accent hover:text-accent motion-reduce:transition-none lg:bottom-6 lg:right-6 ${
        visible
          ? "visible translate-y-0 opacity-100"
          : "invisible translate-y-2 opacity-0"
      }`}
    >
      <ArrowUpIcon />
    </button>
  );
}
