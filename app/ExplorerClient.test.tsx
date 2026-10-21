import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
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

describe("ExplorerClient — asynchronous navigation", () => {
  // Real router.replace doesn't update the URL until the server round trip
  // finishes; the mock above is synchronous, so these tests defer it.
  function deferReplace(delayMs: number, times: number) {
    for (let i = 0; i < times; i++) {
      nav.replace.mockImplementationOnce((url: string) => {
        setTimeout(() => act(() => nav.set(url.split("?")[1] ?? "")), delayMs);
      });
    }
  }

  it("keeps an earlier filter when the next one is chosen before the URL catches up (RF-5)", async () => {
    const user = userEvent.setup();
    serve();
    renderExplorer();
    await screen.findByText("popular p1");
    deferReplace(150, 2);

    await user.selectOptions(screen.getByLabelText("Genre"), "Drama");
    await user.selectOptions(screen.getByLabelText("Year"), "1999");

    await waitFor(() => expect(nav.state.search).toBe("genre=18&year=1999"), {
      timeout: 1500,
    });
    expect(urls()).toEqual(["/?genre=18", "/?genre=18&year=1999"]);
    expect(screen.getByLabelText("Genre")).toHaveValue("18");
    expect(screen.getByLabelText("Year")).toHaveValue("1999");
  });

  it("shows the chosen filter right away, before the URL has updated", async () => {
    const user = userEvent.setup();
    serve();
    renderExplorer();
    await screen.findByText("popular p1");
    deferReplace(300, 1);

    await user.selectOptions(screen.getByLabelText("Genre"), "Drama");

    expect(nav.state.search).toBe("");
    expect(screen.getByLabelText("Genre")).toHaveValue("18");
    await waitFor(() => expect(nav.state.search).toBe("genre=18"), {
      timeout: 1500,
    });
    expect(screen.getByLabelText("Genre")).toHaveValue("18");
  });

  it("still follows a URL change from outside while nothing is pending", async () => {
    serve();
    renderExplorer();
    await screen.findByText("popular p1");

    act(() => nav.set("genre=28"));

    expect(await screen.findByText("genre=28 p1")).toBeInTheDocument();
    expect(screen.getByLabelText("Genre")).toHaveValue("28");
  });
});

// The 300 ms search delay (explore-filters RF-6) is an exact number, so it is
// tested with a controlled clock. Only the timers are faked, and the text goes
// in as one change event: user-event waits on timers the fake clock would block.
describe("ExplorerClient — search delay", () => {
  const SEEDED: ExploreInitialPage = {
    filters: { mode: "popular" },
    page: {
      movies: [
        { id: 1, title: "popular p1", posterUrl: null, releaseYear: 2000, rating: 7 },
      ],
      page: 1,
      totalPages: 1,
    },
  };

  async function typeWithControlledClock(text: string) {
    serve();
    renderExplorer({ initial: SEEDED });
    expect(screen.getByText("popular p1")).toBeInTheDocument();

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(searchBox(), { target: { value: text } });
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not update the URL until 300 ms after the last keystroke (RF-6)", async () => {
    await typeWithControlledClock("matrix");

    act(() => {
      vi.advanceTimersByTime(299);
    });

    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("updates the URL once, exactly at 300 ms (RF-6)", async () => {
    await typeWithControlledClock("matrix");

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(urls()).toEqual(["/?q=matrix"]);
  });
});

// home-redesign RF-18, RF-21, RF-22: the redesigned bar, the heading that says
// what is shown, and the polite announcement of a loaded selection.
const resultsHeading = () =>
  within(screen.getByTestId("results-anchor")).getByRole("heading", { level: 2 });

// The announcer is the only polite live region: the loading skeletons and the
// empty state are role=status without aria-live.
const announcer = () =>
  screen
    .queryAllByRole("status")
    .find((element) => element.getAttribute("aria-live") === "polite") ?? null;

describe("ExplorerClient — results heading (RF-21)", () => {
  it("reads \"Popular movies\" by default", async () => {
    serve();
    renderExplorer();
    await screen.findByText("popular p1");

    expect(resultsHeading()).toHaveTextContent("Popular movies");
  });

  it("reads the trimmed search text between curly quotes", async () => {
    serve();
    nav.set("q=matrix");
    renderExplorer();
    await screen.findByText("q=matrix p1");

    expect(resultsHeading()).toHaveTextContent("Results for “matrix”");
  });

  it("joins the names of the active filters in the order genre, year, sort", async () => {
    serve();
    nav.set("genre=18&year=1999&sort=vote_average.desc");
    renderExplorer();
    await screen.findByText(/genre=18/);

    expect(resultsHeading()).toHaveTextContent(
      "Drama · 1999 · Highest rated"
    );
  });

  it("reads \"Filtered movies\" when no active filter can be named", async () => {
    serve();
    nav.set("genre=999");
    renderExplorer();
    await screen.findByText(/genre=999/);

    expect(resultsHeading()).toHaveTextContent("Filtered movies");
  });

  it("follows the filters as they change", async () => {
    const user = userEvent.setup();
    serve();
    renderExplorer();
    await screen.findByText("popular p1");

    await user.selectOptions(screen.getByLabelText("Genre"), "Drama");
    expect(resultsHeading()).toHaveTextContent("Drama");

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(resultsHeading()).toHaveTextContent("Popular movies");
  });

  it("can receive focus from a script but is not a tab stop (RF-25)", async () => {
    serve();
    renderExplorer();
    await screen.findByText("popular p1");

    expect(resultsHeading()).toHaveAttribute("tabindex", "-1");
  });

  it("stays above the results, inside the results anchor, and keeps the anchor's test id", async () => {
    serve();
    renderExplorer();
    await screen.findByText("popular p1");

    const anchor = screen.getByTestId("results-anchor");
    expect(anchor.firstElementChild).toBe(resultsHeading());
  });

  it("is shortened to one line visually and stays complete in the text", async () => {
    const long = "a".repeat(120);
    serve();
    nav.set(`q=${long}`);
    renderExplorer();
    await screen.findByText(new RegExp(long.slice(0, 20)));

    expect(resultsHeading()).toHaveClass("truncate");
    expect(resultsHeading()).toHaveTextContent(`Results for “${long}”`);
  });
});

describe("ExplorerClient — announcement of the results (RF-22)", () => {
  it("says the heading's text once a search has loaded with results", async () => {
    serve();
    nav.set("q=matrix");
    renderExplorer();
    await screen.findByText("q=matrix p1");

    expect(announcer()).toHaveTextContent("Results for “matrix”");
  });

  it("says the heading's text once a filter selection has loaded", async () => {
    const user = userEvent.setup();
    serve();
    renderExplorer();
    await screen.findByText("popular p1");

    await user.selectOptions(screen.getByLabelText("Genre"), "Drama");
    await screen.findByText("genre=18 p1");

    expect(announcer()).toHaveTextContent("Drama");
  });

  it("says nothing while the first page is still loading", async () => {
    serve({
      respond: async () => {
        await delay(100);
        return HttpResponse.json({
          movies: [
            { id: 1, title: "late p1", posterUrl: null, releaseYear: 2000, rating: 7 },
          ],
          page: 1,
          totalPages: 1,
        });
      },
    });
    nav.set("q=matrix");
    renderExplorer();

    expect(announcer()).toBeNull();
    await screen.findByText("late p1");
    expect(announcer()).toHaveTextContent("Results for “matrix”");
  });

  it("says nothing for an empty result: the empty state is the only announcement", async () => {
    serve({
      respond: () => HttpResponse.json({ movies: [], page: 1, totalPages: 0 }),
    });
    nav.set("q=zzz");
    renderExplorer();

    await screen.findByText('No movies match "zzz". Try a different title.');

    expect(announcer()).toBeNull();
  });

  it("says nothing for the plain popular list", async () => {
    serve();
    renderExplorer();
    await screen.findByText("popular p1");

    expect(announcer()).toBeNull();
  });
});

describe("ExplorerClient — the redesigned bar (RF-18)", () => {
  it("renders the search field and the filters in the bar, before the results", async () => {
    serve();
    renderExplorer();
    await screen.findByText("popular p1");

    const anchor = screen.getByTestId("results-anchor");
    for (const control of [
      searchBox(),
      screen.getByLabelText("Genre"),
      screen.getByLabelText("Year"),
      screen.getByLabelText("Sort by"),
    ]) {
      expect(
        control.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
  });

  it("keeps the room of Clear filters while no filter is active", async () => {
    const { container } = (serve(), renderExplorer());
    await screen.findByText("popular p1");

    expect(
      container.querySelector('[data-slot="clear-filters-room"]')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear filters" })
    ).not.toBeInTheDocument();
  });
});

// home-redesign RF-24, RF-25: the back-to-top button appears once a sentinel
// placed below the bar has scrolled past; activating it scrolls to the bar and
// sends focus to the results heading.
const BUTTON_NAME = "Back to top of results";

function backToTopSentinel() {
  const element = document.querySelector('[data-slot="back-to-top-sentinel"]');
  if (!element) throw new Error("no back-to-top sentinel in the page");
  return element;
}

function reportSentinel(where: "above" | "below" | "inside") {
  const element = backToTopSentinel();
  element.getBoundingClientRect = () =>
    ({ top: where === "above" ? -120 : where === "below" ? 900 : 100 }) as DOMRect;
  act(() => {
    MockIntersectionObserver.instances
      .filter((observer) => observer.observed.has(element))
      .forEach((observer) => observer.trigger(where === "inside"));
  });
}

const theBar = () =>
  searchBox().closest('[data-slot="search-field"]')!.parentElement as HTMLElement;

describe("ExplorerClient — back to top (RF-24, RF-25)", () => {
  it("has no button in the tab order at first", async () => {
    const user = userEvent.setup();
    serve();
    renderExplorer();
    await screen.findByText("popular p1");

    expect(
      screen.queryByRole("button", { name: BUTTON_NAME })
    ).not.toBeInTheDocument();
    for (let i = 0; i < 4; i++) await user.tab();
    expect(screen.getByLabelText(BUTTON_NAME)).not.toHaveFocus();
  });

  it("puts the sentinel inside the bar's block, not in the results", async () => {
    serve();
    renderExplorer();
    await screen.findByText("popular p1");

    const sentinel = backToTopSentinel();
    expect(sentinel).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("results-anchor")).not.toContainElement(
      sentinel as HTMLElement
    );
    expect(sentinel.className).toContain("top-(--offset-back-to-top)");
  });

  it("appears when the sentinel has passed and goes away when it comes back", async () => {
    serve();
    renderExplorer();
    await screen.findByText("popular p1");

    reportSentinel("below");
    expect(
      screen.queryByRole("button", { name: BUTTON_NAME })
    ).not.toBeInTheDocument();

    reportSentinel("above");
    expect(screen.getByRole("button", { name: BUTTON_NAME })).toBeInTheDocument();

    reportSentinel("inside");
    expect(
      screen.queryByRole("button", { name: BUTTON_NAME })
    ).not.toBeInTheDocument();
  });

  it("scrolls smoothly to the bar and moves focus to the results heading", async () => {
    const user = userEvent.setup();
    serve();
    renderExplorer();
    await screen.findByText("popular p1");
    reportSentinel("above");
    scrollIntoView.mockClear();

    await user.click(screen.getByRole("button", { name: BUTTON_NAME }));

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(theBar());
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "start",
      behavior: "smooth",
    });
    expect(resultsHeading()).toHaveFocus();
  });

  it("scrolls without animation when the visitor prefers reduced motion", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    try {
      serve();
      renderExplorer();
      await screen.findByText("popular p1");
      reportSentinel("above");
      scrollIntoView.mockClear();

      await user.click(screen.getByRole("button", { name: BUTTON_NAME }));

      expect(scrollIntoView).toHaveBeenCalledWith({
        block: "start",
        behavior: "auto",
      });
      expect(resultsHeading()).toHaveFocus();
    } finally {
      vi.unstubAllGlobals();
      vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    }
  });

  it("does not take over the scroll of a filter change (RF-19 stays as it is)", async () => {
    const user = userEvent.setup();
    serve();
    renderExplorer();
    await screen.findByText("popular p1");
    scrollIntoView.mockClear();

    await user.selectOptions(screen.getByLabelText("Genre"), "Drama");

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(
      screen.getByTestId("results-anchor")
    );
  });
});
