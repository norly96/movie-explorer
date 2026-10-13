import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, delay, http } from "msw";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockIntersectionObserver } from "../mocks/intersection-observer";
import { server } from "../mocks/server";
import type { Genre } from "../services/schemas/genre-schema";
import type { ExploreInitialPage } from "../hooks/useExploreMovies";

// next/navigation is mocked with a tiny in-memory URL so that router.replace
// really changes what useSearchParams returns — the component's source of
// truth is the URL (plan.md D2).
const nav = vi.hoisted(() => {
  const state = { search: "", listeners: new Set<() => void>() };
  const set = (search: string) => {
    state.search = search;
    state.listeners.forEach((listener) => listener());
  };
  return {
    state,
    set,
    replace: vi.fn((url: string) => set(url.split("?")[1] ?? "")),
    push: vi.fn(),
  };
});

vi.mock("next/navigation", async () => {
  const { useMemo, useSyncExternalStore } = await import("react");
  const router = { replace: nav.replace, push: nav.push };
  return {
    useRouter: () => router,
    usePathname: () => "/",
    useSearchParams: () => {
      const search = useSyncExternalStore(
        (listener) => {
          nav.state.listeners.add(listener);
          return () => nav.state.listeners.delete(listener);
        },
        () => nav.state.search,
        () => nav.state.search
      );
      return useMemo(() => new URLSearchParams(search), [search]);
    },
  };
});

const { ExplorerClient } = await import("./ExplorerClient");

const GENRES: Genre[] = [
  { id: 28, name: "Action" },
  { id: 18, name: "Drama" },
];

const EXPLORE_URL = "*/api/explore";
const scrollIntoView = vi.fn();

// Every page is one movie titled "<query without page> p<page>", so a
// test can tell exactly which request produced what is on screen.
function labelOf(url: URL) {
  const parts = [...url.searchParams]
    .filter(([key]) => key !== "page")
    .map(([key, value]) => `${key}=${value}`);
  return parts.join("&") || "popular";
}

function serve(
  options: {
    totalPages?: number;
    respond?: (url: URL, page: number) => Response | Promise<Response>;
  } = {}
) {
  const { totalPages = 3, respond } = options;
  const calls: URL[] = [];
  server.use(
    http.get(EXPLORE_URL, ({ request }) => {
      const url = new URL(request.url);
      calls.push(url);
      const page = Number(url.searchParams.get("page"));
      if (respond) return respond(url, page);
      return HttpResponse.json({
        movies: [
          {
            id: page,
            title: `${labelOf(url)} p${page}`,
            posterUrl: null,
            releaseYear: 2000,
            rating: 7,
          },
        ],
        page,
        totalPages,
      });
    })
  );
  return calls;
}

function renderExplorer(
  props: { genres?: Genre[]; initial?: ExploreInitialPage } = {}
) {
  const client = new QueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<ExplorerClient genres={props.genres ?? GENRES} initial={props.initial} />, {
    wrapper: Wrapper,
  });
}

const urls = () => nav.replace.mock.calls.map((call) => call[0]);
const lastUrl = () => urls().at(-1);

// next/link also uses IntersectionObserver (prefetching), so the infinite
// scroll sentinel is told apart by the 400px margin useInfiniteScrollTrigger
// gives it.
function sentinelObservers() {
  return MockIntersectionObserver.instances.filter(
    (observer) => !observer.disconnected && observer.rootMargin === "400px"
  );
}

function intersect() {
  act(() => {
    sentinelObservers().forEach((observer) => observer.trigger(true));
  });
}

const searchBox = () => screen.getByLabelText("Search movies");

beforeEach(() => {
  nav.set("");
  nav.replace.mockClear();
  nav.push.mockClear();
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  nav.set("");
});

describe("ExplorerClient — results", () => {
  it("shows the first page of the popular list for a bare URL (RF-1, RF-16)", async () => {
    serve();
    renderExplorer();

    expect(
      screen.getByRole("status", { name: "Loading movies" })
    ).toBeInTheDocument();
    expect(await screen.findByText("popular p1")).toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "Loading movies" })
    ).not.toBeInTheDocument();
  });

  it("renders the server-provided first page without requesting it (RF-9)", async () => {
    const calls = serve();
    nav.set("genre=18");
    renderExplorer({
      initial: {
        filters: { mode: "discover", genreId: 18, year: null, sort: null },
        page: {
          movies: [
            { id: 77, title: "From the server", posterUrl: null, releaseYear: 1999, rating: 8 },
          ],
          page: 1,
          totalPages: 1,
        },
      },
    });

    expect(screen.getByText("From the server")).toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "Loading movies" })
    ).not.toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(calls).toHaveLength(0);
  });

  it("applies filters found in the URL on first render (RF-9)", async () => {
    serve();
    nav.set("genre=18&year=1999");
    renderExplorer();

    expect(await screen.findByText("genre=18&year=1999 p1")).toBeInTheDocument();
    expect(screen.getByLabelText("Genre")).toHaveValue("18");
    expect(screen.getByLabelText("Year")).toHaveValue("1999");
  });

  it("shows an empty state naming the search term (RF-13)", async () => {
    serve({
      respond: () =>
        HttpResponse.json({ movies: [], page: 1, totalPages: 0 }),
    });
    nav.set("q=zzz");
    renderExplorer();

    expect(
      await screen.findByText('No movies match "zzz". Try a different title.')
    ).toBeInTheDocument();
  });

  it("shows an empty state for filters that match nothing (RF-13)", async () => {
    serve({
      respond: () =>
        HttpResponse.json({ movies: [], page: 1, totalPages: 0 }),
    });
    nav.set("genre=18");
    renderExplorer();

    expect(
      await screen.findByText(
        "No movies match these filters. Try changing or clearing them."
      )
    ).toBeInTheDocument();
  });

  it("shows the full error state and retries the first page (RF-14)", async () => {
    const user = userEvent.setup();
    let failing = true;
    serve({
      respond: (url, page) =>
        failing
          ? HttpResponse.json({ reason: "http", status: 500 }, { status: 502 })
          : HttpResponse.json({
              movies: [
                { id: 1, title: `${labelOf(url)} p${page}`, posterUrl: null, releaseYear: 2000, rating: 7 },
              ],
              page,
              totalPages: 1,
            }),
    });
    renderExplorer();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load movies");
    failing = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("popular p1")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("ExplorerClient — filters", () => {
  it("combines genre, year and sort instead of replacing each other (RF-5)", async () => {
    const user = userEvent.setup();
    serve();
    renderExplorer();
    await screen.findByText("popular p1");

    await user.selectOptions(screen.getByLabelText("Genre"), "Drama");
    await user.selectOptions(screen.getByLabelText("Year"), "1999");
    await user.selectOptions(screen.getByLabelText("Sort by"), "Highest rated");

    expect(urls()).toEqual([
      "/?genre=18",
      "/?genre=18&year=1999",
      "/?genre=18&year=1999&sort=vote_average.desc",
    ]);
    expect(
      await screen.findByText("genre=18&year=1999&sort=vote_average.desc p1")
    ).toBeInTheDocument();
  });

  it("unsetting the last filter returns to the popular list", async () => {
    const user = userEvent.setup();
    serve();
    nav.set("genre=18");
    renderExplorer();
    await screen.findByText("genre=18 p1");

    await user.selectOptions(screen.getByLabelText("Genre"), "All genres");

    expect(lastUrl()).toBe("/");
    expect(await screen.findByText("popular p1")).toBeInTheDocument();
  });

  it("selecting a filter while a search is active clears the query (RF-7)", async () => {
    const user = userEvent.setup();
    serve();
    nav.set("q=matrix");
    renderExplorer();
    expect(searchBox()).toHaveValue("matrix");
    await screen.findByText("q=matrix p1");

    await user.selectOptions(screen.getByLabelText("Genre"), "Drama");

    expect(lastUrl()).toBe("/?genre=18");
    expect(searchBox()).toHaveValue("");
    expect(await screen.findByText("genre=18 p1")).toBeInTheDocument();
  });

  it("typing a search while filters are active clears all of them (RF-7)", async () => {
    const user = userEvent.setup();
    serve();
    nav.set("genre=18&year=1999&sort=popularity.asc");
    renderExplorer();
    await screen.findByText("genre=18&year=1999&sort=popularity.asc p1");

    await user.type(searchBox(), "matrix");

    await waitFor(() => expect(lastUrl()).toBe("/?q=matrix"), { timeout: 1500 });
    expect(screen.getByLabelText("Genre")).toHaveValue("");
    expect(screen.getByLabelText("Year")).toHaveValue("");
    expect(screen.getByLabelText("Sort by")).toHaveValue("");
    expect(await screen.findByText("q=matrix p1")).toBeInTheDocument();
  });
});

describe("ExplorerClient — search", () => {
  it("debounces typing into a single URL update (RF-6)", async () => {
    const user = userEvent.setup();
    serve();
    renderExplorer();
    await screen.findByText("popular p1");

    await user.type(searchBox(), "matrix");
    expect(nav.replace).not.toHaveBeenCalled();

    await waitFor(() => expect(nav.replace).toHaveBeenCalled(), { timeout: 1500 });
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(urls()).toEqual(["/?q=matrix"]);
  });

  it("does not search under 2 characters or for whitespace only (RF-6)", async () => {
    const user = userEvent.setup();
    serve();
    renderExplorer();
    await screen.findByText("popular p1");

    await user.type(searchBox(), "a");
    await new Promise((resolve) => setTimeout(resolve, 450));
    await user.clear(searchBox());
    await user.type(searchBox(), "   ");
    await new Promise((resolve) => setTimeout(resolve, 450));

    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("returns to the popular list when the field is cleared below 2 characters, keeping what was typed", async () => {
    const user = userEvent.setup();
    serve();
    nav.set("q=matrix");
    renderExplorer();
    await screen.findByText("q=matrix p1");

    await user.clear(searchBox());
    await user.type(searchBox(), "m");

    await waitFor(() => expect(lastUrl()).toBe("/"), { timeout: 1500 });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(searchBox()).toHaveValue("m");
    expect(await screen.findByText("popular p1")).toBeInTheDocument();
  });

  it("follows the URL when it changes from outside, e.g. browser back (RF-8, RF-9)", async () => {
    serve();
    renderExplorer();
    await screen.findByText("popular p1");

    act(() => nav.set("q=batman"));

    expect(searchBox()).toHaveValue("batman");
    expect(await screen.findByText("q=batman p1")).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(nav.replace).not.toHaveBeenCalled();
  });
});

describe("ExplorerClient — URL and scroll behavior", () => {
  it("uses router.replace and never router.push for every change (RF-20)", async () => {
    const user = userEvent.setup();
    serve();
    renderExplorer();
    await screen.findByText("popular p1");

    await user.selectOptions(screen.getByLabelText("Genre"), "Drama");
    await user.selectOptions(screen.getByLabelText("Year"), "1999");
    await user.selectOptions(screen.getByLabelText("Sort by"), "Newest first");
    await user.type(searchBox(), "matrix");
    await waitFor(() => expect(lastUrl()).toBe("/?q=matrix"), { timeout: 1500 });
    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(nav.replace.mock.calls.length).toBeGreaterThanOrEqual(5);
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("scrolls the results anchor into view on every change and on clear (RF-19)", async () => {
    const user = userEvent.setup();
    serve();
    renderExplorer();
    await screen.findByText("popular p1");

    await user.selectOptions(screen.getByLabelText("Genre"), "Drama");
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(
      screen.getByTestId("results-anchor")
    );

    await user.type(searchBox(), "matrix");
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(2), {
      timeout: 1500,
    });

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(scrollIntoView).toHaveBeenCalledTimes(3);
  });

  it("does not touch the URL or scroll when nothing actually changes", async () => {
    const user = userEvent.setup();
    serve();
    nav.set("genre=18");
    renderExplorer();
    await screen.findByText("genre=18 p1");

    await user.selectOptions(screen.getByLabelText("Genre"), "Drama");

    expect(nav.replace).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

describe("ExplorerClient — clear filters", () => {
  it("is hidden while nothing is active (RF-17)", async () => {
    serve();
    renderExplorer();
    await screen.findByText("popular p1");

    expect(
      screen.queryByRole("button", { name: "Clear filters" })
    ).not.toBeInTheDocument();
  });

  it("is visible with a filter or a search, and clears everything in one action (RF-17)", async () => {
    const user = userEvent.setup();
    serve();
    nav.set("genre=18&year=1999");
    renderExplorer();
    await screen.findByText("genre=18&year=1999 p1");

    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(lastUrl()).toBe("/");
    expect(await screen.findByText("popular p1")).toBeInTheDocument();
    expect(screen.getByLabelText("Genre")).toHaveValue("");
    expect(screen.getByLabelText("Year")).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: "Clear filters" })
    ).not.toBeInTheDocument();
  });

  it("clears an active search and empties the field (RF-17)", async () => {
    const user = userEvent.setup();
    serve();
    nav.set("q=matrix");
    renderExplorer();
    await screen.findByText("q=matrix p1");

    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(lastUrl()).toBe("/");
    expect(searchBox()).toHaveValue("");
  });
});

describe("ExplorerClient — infinite scroll", () => {
  it("loads the next page when the sentinel comes into view (RF-11)", async () => {
    serve();
    nav.set("genre=18");
    renderExplorer();
    await screen.findByText("genre=18 p1");

    intersect();

    expect(await screen.findByText("genre=18 p2")).toBeInTheDocument();
    expect(screen.getByText("genre=18 p1")).toBeInTheDocument();
  });

  it("shows an inline loading indicator while the next page loads (RF-16)", async () => {
    serve({
      respond: async (url, page) => {
        if (page === 2) await delay(150);
        return HttpResponse.json({
          movies: [{ id: page, title: `${labelOf(url)} p${page}`, posterUrl: null, releaseYear: 2000, rating: 7 }],
          page,
          totalPages: 3,
        });
      },
    });
    renderExplorer();
    await screen.findByText("popular p1");

    intersect();

    expect(
      await screen.findByRole("status", { name: "Loading more movies" })
    ).toBeInTheDocument();
    expect(screen.getByText("popular p1")).toBeInTheDocument();
    await screen.findByText("popular p2");
    expect(
      screen.queryByRole("status", { name: "Loading more movies" })
    ).not.toBeInTheDocument();
  });

  it("keeps loaded results and shows an inline retry when a later page fails (RF-15, RF-22)", async () => {
    const user = userEvent.setup();
    let failPageTwo = true;
    serve({
      respond: (url, page) =>
        page === 2 && failPageTwo
          ? HttpResponse.json({ reason: "network" }, { status: 502 })
          : HttpResponse.json({
              movies: [{ id: page, title: `${labelOf(url)} p${page}`, posterUrl: null, releaseYear: 2000, rating: 7 }],
              page,
              totalPages: 3,
            }),
    });
    renderExplorer();
    await screen.findByText("popular p1");

    intersect();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load more movies");
    expect(screen.getByText("popular p1")).toBeInTheDocument();

    failPageTwo = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("popular p2")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("stops observing once there are no more pages (RF-12)", async () => {
    serve({ totalPages: 1 });
    renderExplorer();
    await screen.findByText("popular p1");

    expect(sentinelObservers()).toHaveLength(0);
  });
});

describe("ExplorerClient — degraded genres and keyboard", () => {
  it("keeps year, sort and search operable when genres is empty (RF-21)", async () => {
    const user = userEvent.setup();
    serve();
    renderExplorer({ genres: [] });
    await screen.findByText("popular p1");

    expect(screen.queryByLabelText("Genre")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Year"), "1999");
    expect(lastUrl()).toBe("/?year=1999");
    await user.selectOptions(screen.getByLabelText("Sort by"), "Newest first");
    expect(lastUrl()).toBe("/?year=1999&sort=primary_release_date.desc");

    await user.type(searchBox(), "matrix");
    await waitFor(() => expect(lastUrl()).toBe("/?q=matrix"), { timeout: 1500 });
    expect(await screen.findByText("q=matrix p1")).toBeInTheDocument();
  });

  it("reaches the search field and every filter with Tab, in order (RF-18)", async () => {
    const user = userEvent.setup();
    serve();
    renderExplorer();
    await screen.findByText("popular p1");

    await user.tab();
    expect(searchBox()).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Genre")).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Year")).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Sort by")).toHaveFocus();
  });
});
