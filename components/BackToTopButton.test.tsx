import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BackToTopButton } from "./BackToTopButton";

const NAME = "Back to top of results";

// home-redesign RF-24, RF-26: an icon-only button, shown only after the visitor
// has scrolled well past the search and filters bar. While it is not shown it is
// out of the keyboard's reach and hidden from assistive technology.
describe("BackToTopButton", () => {
  describe("when visible", () => {
    it("is an icon-only button named \"Back to top of results\"", () => {
      const { container } = render(<BackToTopButton visible onActivate={() => {}} />);

      const button = screen.getByRole("button", { name: NAME });
      expect(button).toHaveTextContent("");
      const icon = container.querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });

    it("is reachable with the keyboard", async () => {
      const user = userEvent.setup();
      render(<BackToTopButton visible onActivate={() => {}} />);

      await user.tab();

      expect(screen.getByRole("button", { name: NAME })).toHaveFocus();
    });

    it("calls its handler on a click and on Enter", async () => {
      const user = userEvent.setup();
      const onActivate = vi.fn();
      render(<BackToTopButton visible onActivate={onActivate} />);

      await user.click(screen.getByRole("button", { name: NAME }));
      screen.getByRole("button", { name: NAME }).focus();
      await user.keyboard("{Enter}");

      expect(onActivate).toHaveBeenCalledTimes(2);
    });
  });

  describe("when not visible", () => {
    it("is hidden from assistive technology", () => {
      render(<BackToTopButton visible={false} onActivate={() => {}} />);

      expect(screen.queryByRole("button", { name: NAME })).not.toBeInTheDocument();
      expect(screen.getByLabelText(NAME)).toHaveAttribute("aria-hidden", "true");
    });

    it("is unreachable by keyboard", async () => {
      const user = userEvent.setup();
      render(<BackToTopButton visible={false} onActivate={() => {}} />);

      await user.tab();

      expect(document.body).toHaveFocus();
      const button = screen.getByLabelText(NAME);
      expect(button).toHaveAttribute("tabindex", "-1");
      expect(button).toHaveAttribute("inert");
    });

    it("stays in the page, so it can fade in instead of popping in", () => {
      render(<BackToTopButton visible={false} onActivate={() => {}} />);

      expect(screen.getByLabelText(NAME)).toBeInTheDocument();
    });
  });

  describe("look, from design.md", () => {
    it("is a bordered square of the back-to-top size on surface-raised", () => {
      render(<BackToTopButton visible onActivate={() => {}} />);

      const button = screen.getByRole("button", { name: NAME });
      expect(button).toHaveClass("size-(--size-back-to-top)");
      expect(button).toHaveClass("bg-surface-raised");
      expect(button).toHaveClass("border", "border-border-strong", "rounded-md");
      expect(button).toHaveClass("text-foreground");
    });

    it("turns its border and icon accent on hover", () => {
      render(<BackToTopButton visible onActivate={() => {}} />);

      const button = screen.getByRole("button", { name: NAME });
      expect(button).toHaveClass("hover:border-accent", "hover:text-accent");
    });

    it("is fixed at the bottom right, 16px from the edges and 24px from lg", () => {
      render(<BackToTopButton visible onActivate={() => {}} />);

      const button = screen.getByRole("button", { name: NAME });
      expect(button).toHaveClass("fixed", "bottom-4", "right-4");
      expect(button).toHaveClass("lg:bottom-6", "lg:right-6");
    });

    it("fades and rises over the appear duration, and not at all with reduced motion", () => {
      render(<BackToTopButton visible={false} onActivate={() => {}} />);

      const hidden = screen.getByLabelText(NAME);
      expect(hidden).toHaveClass("opacity-0", "translate-y-2", "invisible");
      expect(hidden).toHaveClass("duration-(--duration-appear)", "ease-out");
      expect(hidden).toHaveClass("motion-reduce:transition-none");
    });

    it("is fully shown and in place when visible", () => {
      render(<BackToTopButton visible onActivate={() => {}} />);

      const button = screen.getByRole("button", { name: NAME });
      expect(button).toHaveClass("opacity-100", "translate-y-0", "visible");
      expect(button).not.toHaveAttribute("aria-hidden");
      expect(button).not.toHaveAttribute("inert");
    });

    it("uses no arbitrary pixel values", () => {
      render(<BackToTopButton visible onActivate={() => {}} />);

      expect(screen.getByRole("button", { name: NAME }).className).not.toMatch(/\[\d/);
    });
  });
});
