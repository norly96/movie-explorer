import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { aboutMetadata } from "../app/site-metadata";
import { TmdbAttribution } from "./TmdbAttribution";

// What TMDB's API terms of use (section 3) require, and what home-redesign
// RF-30 asks for: the notice, worded exactly, and TMDB's logo, which must be
// less prominent than the application's own name and mark.
const NOTICE =
  "This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.";

describe("TmdbAttribution (RF-30)", () => {
  it("shows the notice that TMDB requires, word for word", () => {
    render(<TmdbAttribution />);

    expect(screen.getByText(NOTICE)).toBeInTheDocument();
  });

  it("shows TMDB's logo with a text alternative", () => {
    render(<TmdbAttribution />);

    const logo = screen.getByRole("img", { name: "TMDB" });
    expect(logo.getAttribute("src")).toContain("tmdb-logo.svg");
  });

  it("keeps the logo small, less prominent than the application's own name", () => {
    render(<TmdbAttribution />);

    // 24px high (h-6); the site name in the header is 20px text with a 28px logo.
    expect(screen.getByRole("img", { name: "TMDB" })).toHaveClass("h-6", "w-auto");
    expect(screen.getByText(NOTICE)).toHaveClass("text-sm");
  });

  it("does not say or imply any endorsement", () => {
    render(<TmdbAttribution />);

    expect(screen.queryByText(/endorsed by TMDB|powered by TMDB|official/i)).not.toBeInTheDocument();
  });
});

describe("the TMDB logo file", () => {
  const svg = readFileSync("public/tmdb-logo.svg", "utf-8");

  it("is in the repository, as the unmodified short blue variant", () => {
    expect(svg).toContain('viewBox="0 0 273.42 35.52"');
  });

  it("has no script, link or embedded image", () => {
    expect(svg).not.toMatch(/<script|onload|<image|href="http|<foreignObject/i);
  });
});

describe("the About page (RF-30, RF-34)", () => {
  it("has one level-one heading and the attribution, and declares no main of its own", async () => {
    const { default: AboutPage } = await import("../app/about/page");
    render(<AboutPage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "About" })).toBeInTheDocument();
    expect(screen.getByText(NOTICE)).toBeInTheDocument();
    expect(screen.queryByRole("main")).not.toBeInTheDocument();
  });

  it("exports the About entry of the site metadata", async () => {
    const page = await import("../app/about/page");

    expect(page.metadata).toBe(aboutMetadata);
    expect(page.metadata.title).toBe("About");
  });
});
