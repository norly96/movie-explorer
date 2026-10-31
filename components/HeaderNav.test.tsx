import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The header's navigation marks the current page (home-redesign RF-2). The
// pathname is the only thing it needs from the router, so only that is mocked.
const nav = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
}));

const { HeaderNav } = await import("./HeaderNav");

beforeEach(() => {
  nav.pathname = "/";
});

function link(name: string) {
  return screen.getByRole("link", { name });
}

describe("HeaderNav (RF-2)", () => {
  it('has a "Home" link to / and an "About" link to /about, in a labelled navigation', () => {
    render(<HeaderNav />);

    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(link("Home")).toHaveAttribute("href", "/");
    expect(link("About")).toHaveAttribute("href", "/about");
  });

  it("marks Home as the current page on /", () => {
    render(<HeaderNav />);

    expect(link("Home")).toHaveAttribute("aria-current", "page");
    expect(link("About")).not.toHaveAttribute("aria-current");
  });

  it("keeps Home as the current page when the home has a query string", () => {
    // usePathname() excludes the query string: /?genre=18 is still "/".
    nav.pathname = "/";
    render(<HeaderNav />);

    expect(link("Home")).toHaveAttribute("aria-current", "page");
  });

  it("marks About as the current page on /about", () => {
    nav.pathname = "/about";
    render(<HeaderNav />);

    expect(link("About")).toHaveAttribute("aria-current", "page");
    expect(link("Home")).not.toHaveAttribute("aria-current");
  });

  it("marks neither on a page that is not in the navigation, such as a movie", () => {
    nav.pathname = "/movie/1";
    render(<HeaderNav />);

    expect(link("Home")).not.toHaveAttribute("aria-current");
    expect(link("About")).not.toHaveAttribute("aria-current");
  });

  it("does not mark About for a path that merely starts like it", () => {
    nav.pathname = "/about-us";
    render(<HeaderNav />);

    expect(link("About")).not.toHaveAttribute("aria-current");
  });

  it("shows the current page by more than color: bolder text and an underline", () => {
    nav.pathname = "/about";
    render(<HeaderNav />);

    expect(link("About")).toHaveClass("font-semibold", "border-b-2", "border-accent", "text-accent");
    // The other link reserves the same transparent underline, so the text does
    // not move by a pixel when the current page changes.
    expect(link("Home")).not.toHaveClass("font-semibold");
    expect(link("Home")).not.toHaveClass("border-accent");
    expect(link("Home")).toHaveClass("border-b-2", "border-transparent", "text-muted");
  });
});

// Found by the automated audit of T55: "Home" was 43px wide. The requirement is
// touch targets of at least 44px, so a link is never narrower than the icon
// buttons next to it, with its text centered.
describe("HeaderNav touch targets", () => {
  it("makes each link at least 44px wide, with the text centered", () => {
    nav.pathname = "/";
    render(<HeaderNav />);

    for (const name of ["Home", "About"]) {
      expect(link(name)).toHaveClass("min-w-(--size-icon-button)", "justify-center");
    }
  });
});
