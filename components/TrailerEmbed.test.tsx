import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrailerEmbed } from "./TrailerEmbed";

describe("TrailerEmbed", () => {
  it("renders a youtube-nocookie.com iframe for a given key (RF-4)", () => {
    render(<TrailerEmbed trailerKey="abc123" />);
    const iframe = screen.getByTitle(/trailer/i);

    expect(iframe.tagName).toBe("IFRAME");
    expect(iframe).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/abc123"
    );
  });

  it("is lazy-loaded (RF-6 performance risk mitigation)", () => {
    render(<TrailerEmbed trailerKey="abc123" />);
    expect(screen.getByTitle(/trailer/i)).toHaveAttribute("loading", "lazy");
  });

  it("is keyboard-reachable — no tabindex=-1 (RF-13)", () => {
    render(<TrailerEmbed trailerKey="abc123" />);
    expect(screen.getByTitle(/trailer/i)).not.toHaveAttribute(
      "tabindex",
      "-1"
    );
  });

  it("renders nothing when trailerKey is null (RF-6)", () => {
    const { container } = render(<TrailerEmbed trailerKey={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
