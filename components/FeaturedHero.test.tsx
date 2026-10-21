import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FeaturedMovie } from "../services/schemas/movie-schema";
import { FeaturedHero } from "./FeaturedHero";

function movie(overrides: Partial<FeaturedMovie> = {}): FeaturedMovie {
  return {
    id: 550,
    title: "Fight Club",
    overview: "An insomniac office worker and a soap maker form an underground club.",
    backdropUrl: "https://image.tmdb.org/t/p/original/backdrop.jpg",
    genreIds: [18],
    releaseYear: 1999,
    rating: 8.4,
    ...overrides,
  };
}

function renderHero(
  overrides: Partial<FeaturedMovie> = {},
  genreName: string | null = "Drama"
) {
  return render(<FeaturedHero movie={movie(overrides)} genreName={genreName} />);
}

const title = () => screen.getByRole("heading", { name: "Fight Club" });
const image = (container: HTMLElement) => container.querySelector("img");

// home-redesign RF-6, 10, 14, 15, 16, 17, 28, 32, 33: the featured movie.
describe("FeaturedHero content (RF-6)", () => {
  it("shows the title, the first genre, the year and the rating out of 10", () => {
    renderHero();

    expect(title()).toBeInTheDocument();
    expect(screen.getByText("Drama")).toBeInTheDocument();
    expect(screen.getByText("1999")).toBeInTheDocument();
    expect(screen.getByLabelText("Rated 8.4 out of 10")).toBeInTheDocument();
  });

  it("shows the synopsis", () => {
    renderHero();

    expect(
      screen.getByText(/An insomniac office worker/)
    ).toBeInTheDocument();
  });

  it("limits the synopsis to three lines", () => {
    renderHero();

    expect(screen.getByText(/An insomniac office worker/)).toHaveClass("line-clamp-3");
  });

  it("has a Details link to the movie's page whose name includes the title", () => {
    renderHero();

    const link = screen.getByRole("link", { name: /Fight Club/ });
    expect(link).toHaveAttribute("href", "/movie/550");
    expect(link).toHaveTextContent("Details");
    expect(link.getAttribute("aria-label")).toContain("Details");
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("is the primary button of the screen, at the control height", () => {
    renderHero();

    const link = screen.getByRole("link", { name: /Fight Club/ });
    expect(link).toHaveClass("bg-accent", "text-accent-foreground", "rounded-md");
    expect(link).toHaveClass("h-(--size-control-touch)", "lg:h-(--size-control)");
    expect(link).toHaveClass("w-full", "lg:w-auto");
    expect(link).toHaveClass("hover:bg-accent-hover");
  });
});

describe("FeaturedHero data that is missing (RF-16)", () => {
  it("omits the genre when there is none", () => {
    renderHero({}, null);

    expect(screen.queryByText("Drama")).not.toBeInTheDocument();
    expect(screen.getByText("1999")).toBeInTheDocument();
    // Only what is shown is separated: the year from the rating.
    expect(screen.getAllByText("·")).toHaveLength(1);
  });

  it("omits the year when there is none", () => {
    renderHero({ releaseYear: null });

    expect(screen.queryByText("1999")).not.toBeInTheDocument();
    expect(screen.getByText("Drama")).toBeInTheDocument();
  });

  it("omits an empty synopsis, and one of only spaces", () => {
    const empty = renderHero({ overview: "" });
    expect(empty.container.querySelector("p")).toBeNull();
    empty.unmount();

    const spaces = renderHero({ overview: "   " });
    expect(spaces.container.querySelector("p")).toBeNull();
  });

  it("shows \"No rating\" for an unrated movie, without a star", () => {
    renderHero({ rating: null });

    expect(screen.getByText("No rating")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Rated/)).not.toBeInTheDocument();
  });

  it("separates what it shows with a middle dot hidden from assistive technology", () => {
    renderHero();

    const dots = screen.getAllByText("·");
    expect(dots).toHaveLength(2);
    dots.forEach((dot) => expect(dot).toHaveAttribute("aria-hidden", "true"));
  });
});

describe("FeaturedHero title (RF-14, RF-15)", () => {
  it("keeps its written text and is capitalized by style only", () => {
    renderHero({ title: "Fight Club" });

    expect(title()).toHaveTextContent("Fight Club");
    expect(title()).toHaveClass("uppercase");
  });

  it("is a second-level heading, below the page's only first-level one", () => {
    renderHero();

    expect(title().tagName).toBe("H2");
  });

  it("is on at most two lines, with balanced wrapping, at the hero sizes", () => {
    renderHero();

    expect(title()).toHaveClass("line-clamp-2", "text-balance");
    expect(title()).toHaveClass("text-hero-sm", "lg:text-hero", "font-semibold");
  });
});

describe("FeaturedHero structure", () => {
  it("is a section named by the title, never an article", () => {
    const { container } = renderHero();

    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("SECTION");
    expect(screen.getByRole("region", { name: "Fight Club" })).toBe(root);
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("limits the text column to its token width", () => {
    renderHero();

    const column = title().parentElement as HTMLElement;
    expect(column).toHaveClass("lg:max-w-(--size-hero-text)");
  });

  it("uses no arbitrary values", () => {
    const { container } = renderHero();

    expect(container.innerHTML).not.toMatch(/class="[^"]*\[(\d|#)/);
  });
});

describe("FeaturedHero image (RF-10, RF-17, RF-28, RF-32)", () => {
  it("is decoration: an empty description", () => {
    const { container } = renderHero();

    expect(image(container)).toHaveAttribute("alt", "");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("loads eagerly with high priority and at full width", () => {
    const { container } = renderHero();

    const img = image(container)!;
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(img).toHaveAttribute("sizes", "100vw");
  });

  it("comes from the movie's backdrop", () => {
    const { container } = renderHero();

    expect(decodeURIComponent(image(container)!.getAttribute("src")!)).toContain(
      "image.tmdb.org/t/p/original/backdrop.jpg"
    );
  });

  it("sits in a container with the vertical fade, and the dark layer over it from lg", () => {
    const { container } = renderHero();

    const fade = container.querySelector('[data-slot="hero-image"]')!;
    expect(fade).toHaveClass("hero-fade");
    expect(fade).toContainElement(image(container));
    const scrim = fade.querySelector(".hero-scrim")!;
    expect(scrim).toHaveClass("hidden", "lg:block");
    expect(scrim).toHaveAttribute("aria-hidden", "true");
  });

  it("is 16:9 on top when narrow and fills the hero's area from lg", () => {
    const { container } = renderHero();

    const fade = container.querySelector('[data-slot="hero-image"]')!;
    expect(fade).toHaveClass("aspect-video", "lg:absolute", "lg:inset-0", "lg:aspect-auto");
  });

  it("keeps every piece of text on a plain background when it fails to load", () => {
    const { container } = renderHero();

    fireEvent.error(image(container)!);

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('[data-slot="hero-image"]')).toBeNull();
    expect(title()).toBeInTheDocument();
    expect(screen.getByText("Drama")).toBeInTheDocument();
    expect(screen.getByText("1999")).toBeInTheDocument();
    expect(screen.getByLabelText("Rated 8.4 out of 10")).toBeInTheDocument();
    expect(screen.getByText(/An insomniac office worker/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Fight Club/ })).toBeInTheDocument();
  });
});
