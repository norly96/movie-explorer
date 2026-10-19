import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, delay, http } from "msw";
import { createElement, type ReactNode } from "react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ExploreFilters } from "../app/explore-params";
import { server } from "../mocks/server";
import { useExploreMovies } from "./useExploreMovies";

const EXPLORE_URL = "*/api/explore";

const POPULAR: ExploreFilters = { mode: "popular" };
const DRAMA: ExploreFilters = {
  mode: "discover",
  genreId: 18,
  year: null,
  sort: null,
};
const COMEDY: ExploreFilters = {
  mode: "discover",
  genreId: 35,
  year: null,
  sort: null,
};

function movie(id: number) {
  return {
    id,
    title: `Movie ${id}`,
    posterUrl: null,
    releaseYear: 2000,
    rating: 7,
  };
}

function page(pageNumber: number, totalPages: number, ids: number[]) {
  return { movies: ids.map(movie), page: pageNumber, totalPages };
}

// page N → ids [N*10 + 1, N*10 + 2]
function standardPage(pageNumber: number, totalPages = 3) {
  return page(pageNumber, totalPages, [pageNumber * 10 + 1, pageNumber * 10 + 2]);
}

function ids(movies: { id: number }[]) {
  return movies.map((m) => m.id);
}

function setup(filters: ExploreFilters, initial?: Parameters<typeof useExploreMovies>[1]) {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return renderHook(
    ({ f }: { f: ExploreFilters }) => useExploreMovies(f, initial),
    { wrapper, initialProps: { f: filters } }
  );
}

function serve(handler: (url: URL) => Response | Promise<Response>) {
  const calls: URL[] = [];
  server.use(
    http.get(EXPLORE_URL, ({ request }) => {
      const url = new URL(request.url);
      calls.push(url);
      return handler(url);
    })
  );
  return calls;
}

const pageOf = (url: URL) => Number(url.searchParams.get("page"));

async function loadFirstPage(result: { current: ReturnType<typeof useExploreMovies> }) {
  await waitFor(() => expect(result.current.isFirstLoading).toBe(false));
}

describe("useExploreMovies", () => {
  it("loads the first page: isFirstLoading true, then movies (RF-16)", async () => {
    serve((url) => HttpResponse.json(standardPage(pageOf(url))));

    const { result } = setup(POPULAR);

    expect(result.current.isFirstLoading).toBe(true);
    expect(result.current.movies).toEqual([]);

    await loadFirstPage(result);
    expect(ids(result.current.movies)).toEqual([11, 12]);
    expect(result.current.firstPageError).toBeNull();
    expect(result.current.nextPageError).toBeNull();
    expect(result.current.hasNextPage).toBe(true);
  });

  it("sends the filters and page 1 to the explore endpoint", async () => {
    const calls = serve((url) => HttpResponse.json(standardPage(pageOf(url))));

    const { result } = setup(DRAMA);
    await loadFirstPage(result);

    expect(calls[0].searchParams.get("genre")).toBe("18");
    expect(calls[0].searchParams.get("page")).toBe("1");
  });

  it("sets firstPageError and no movies when the first page fails (RF-14)", async () => {
    serve(() => HttpResponse.json({ reason: "http", status: 500 }, { status: 502 }));

    const { result } = setup(POPULAR);

    await waitFor(() => expect(result.current.firstPageError).toBe("http"));
    expect(result.current.isFirstLoading).toBe(false);
    expect(result.current.movies).toEqual([]);
    expect(result.current.nextPageError).toBeNull();
  });

  it("reports a network failure on the first page (RF-14)", async () => {
    serve(() => HttpResponse.error());

    const { result } = setup(POPULAR);

    await waitFor(() => expect(result.current.firstPageError).toBe("network"));
  });

  it("reports an invalid response on the first page (RF-14)", async () => {
    serve(() => HttpResponse.json({ nonsense: true }));

    const { result } = setup(POPULAR);

    await waitFor(() =>
      expect(result.current.firstPageError).toBe("invalid_response")
    );
  });

  it("treats an empty first page as a success, not an error (RF-13)", async () => {
    serve(() => HttpResponse.json(page(1, 0, [])));

    const { result } = setup(DRAMA);
    await loadFirstPage(result);

    expect(result.current.movies).toEqual([]);
    expect(result.current.firstPageError).toBeNull();
    expect(result.current.hasNextPage).toBe(false);
  });

  it("appends the second page on fetchNextPage and shows the inline loader (RF-11, RF-16)", async () => {
    const calls = serve(async (url) => {
      if (pageOf(url) === 2) await delay(150);
      return HttpResponse.json(standardPage(pageOf(url)));
    });

    const { result } = setup(DRAMA);
    await loadFirstPage(result);

    act(() => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.isFetchingNextPage).toBe(true));
    expect(ids(result.current.movies)).toEqual([11, 12]);

    await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false));
    expect(ids(result.current.movies)).toEqual([11, 12, 21, 22]);
    expect(calls[1].searchParams.get("page")).toBe("2");
    expect(calls[1].searchParams.get("genre")).toBe("18");
  });

  it("keeps the first page and sets nextPageError when a later page fails (RF-15)", async () => {
    serve((url) =>
      pageOf(url) === 2
        ? HttpResponse.json({ reason: "network" }, { status: 502 })
        : HttpResponse.json(standardPage(pageOf(url)))
    );

    const { result } = setup(POPULAR);
    await loadFirstPage(result);
    act(() => result.current.fetchNextPage());

    await waitFor(() => expect(result.current.nextPageError).toBe("network"));
    expect(ids(result.current.movies)).toEqual([11, 12]);
    expect(result.current.firstPageError).toBeNull();
    expect(result.current.isFirstLoading).toBe(false);
  });

  it("does not auto-retry a failed page: fetchNextPage is a no-op while nextPageError is set", async () => {
    const calls = serve((url) =>
      pageOf(url) === 2
        ? HttpResponse.json({ reason: "network" }, { status: 502 })
        : HttpResponse.json(standardPage(pageOf(url)))
    );

    const { result } = setup(POPULAR);
    await loadFirstPage(result);
    act(() => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.nextPageError).not.toBeNull());
    const callsBefore = calls.length;

    act(() => result.current.fetchNextPage());
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(calls).toHaveLength(callsBefore);
  });

  it("retryNextPage clears the error, appends the page and resumes scrolling (RF-22)", async () => {
    let failPageTwo = true;
    serve((url) =>
      pageOf(url) === 2 && failPageTwo
        ? HttpResponse.json({ reason: "http", status: 500 }, { status: 502 })
        : HttpResponse.json(standardPage(pageOf(url)))
    );

    const { result } = setup(POPULAR);
    await loadFirstPage(result);
    act(() => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.nextPageError).toBe("http"));

    failPageTwo = false;
    act(() => result.current.retryNextPage());

    await waitFor(() => expect(result.current.nextPageError).toBeNull());
    await waitFor(() =>
      expect(ids(result.current.movies)).toEqual([11, 12, 21, 22])
    );

    act(() => result.current.fetchNextPage());
    await waitFor(() =>
      expect(ids(result.current.movies)).toEqual([11, 12, 21, 22, 31, 32])
    );
    expect(result.current.nextPageError).toBeNull();
  });

  it("hasNextPage becomes false after the last page and fetchNextPage is then a no-op (RF-12)", async () => {
    const calls = serve((url) => HttpResponse.json(standardPage(pageOf(url), 2)));

    const { result } = setup(POPULAR);
    await loadFirstPage(result);
    expect(result.current.hasNextPage).toBe(true);

    act(() => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.movies).toHaveLength(4));
    expect(result.current.hasNextPage).toBe(false);

    const callsBefore = calls.length;
    act(() => result.current.fetchNextPage());
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(calls).toHaveLength(callsBefore);
    expect(result.current.movies).toHaveLength(4);
    expect(result.current.nextPageError).toBeNull();
  });

  it("treats an empty next page as exhausted even if total_pages says more, with no error (spec Edge cases)", async () => {
    serve((url) =>
      pageOf(url) === 1
        ? HttpResponse.json(standardPage(1, 5))
        : HttpResponse.json(page(2, 5, []))
    );

    const { result } = setup(POPULAR);
    await loadFirstPage(result);
    expect(result.current.hasNextPage).toBe(true);

    act(() => result.current.fetchNextPage());

    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
    expect(ids(result.current.movies)).toEqual([11, 12]);
    expect(result.current.nextPageError).toBeNull();
    expect(result.current.firstPageError).toBeNull();
  });

  it("discards a superseded in-flight response when filters change (Risk #5)", async () => {
    serve(async (url) => {
      const slow = url.searchParams.get("genre") === "18";
      if (slow) await delay(120);
      return HttpResponse.json(
        page(1, 1, slow ? [101, 102] : [201, 202])
      );
    });

    const { result, rerender } = setup(DRAMA);
    expect(result.current.isFirstLoading).toBe(true);

    rerender({ f: COMEDY });
    await waitFor(() =>
      expect(ids(result.current.movies)).toEqual([201, 202])
    );

    // Let the slow, superseded DRAMA request resolve.
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(ids(result.current.movies)).toEqual([201, 202]);
  });

  it("shows the loading state, not the old results, right after filters change (RF-16)", async () => {
    serve(async (url) => {
      if (url.searchParams.get("genre") === "35") await delay(50);
      return HttpResponse.json(page(1, 1, [url.searchParams.get("genre") === "35" ? 201 : 101]));
    });

    const { result, rerender } = setup(DRAMA);
    await loadFirstPage(result);
    expect(ids(result.current.movies)).toEqual([101]);

    rerender({ f: COMEDY });

    expect(result.current.isFirstLoading).toBe(true);
    expect(result.current.movies).toEqual([]);
    await waitFor(() => expect(ids(result.current.movies)).toEqual([201]));
  });

  describe("server-provided first page", () => {
    it("uses it without requesting page 1 when the filters match", async () => {
      const calls = serve((url) => HttpResponse.json(standardPage(pageOf(url))));

      const { result } = setup(DRAMA, {
        filters: DRAMA,
        page: page(1, 3, [901, 902]),
      });

      expect(result.current.isFirstLoading).toBe(false);
      expect(ids(result.current.movies)).toEqual([901, 902]);
      expect(result.current.hasNextPage).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(calls).toHaveLength(0);

      act(() => result.current.fetchNextPage());
      await waitFor(() =>
        expect(ids(result.current.movies)).toEqual([901, 902, 21, 22])
      );
      expect(pageOf(calls[0])).toBe(2);
    });

    it("ignores it and fetches normally when the filters differ", async () => {
      const calls = serve(() => HttpResponse.json(page(1, 1, [301])));

      const { result } = setup(COMEDY, {
        filters: DRAMA,
        page: page(1, 3, [901, 902]),
      });

      expect(result.current.isFirstLoading).toBe(true);
      await waitFor(() => expect(ids(result.current.movies)).toEqual([301]));
      expect(calls).toHaveLength(1);
    });
  });

  it("does not request anything extra on mount beyond page 1", async () => {
    const handler = vi.fn((url: URL) => HttpResponse.json(standardPage(pageOf(url))));
    const calls = serve(handler);

    const { result } = setup(POPULAR);
    await loadFirstPage(result);
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(calls).toHaveLength(1);
  });
});

describe("useExploreMovies — movies repeated across pages (RF-23)", () => {
  // TMDB's ordering shifts between requests, so consecutive pages overlap.
  function servePages(byPage: Record<number, number[]>, totalPages = 3) {
    return serve((url) => {
      const n = pageOf(url);
      return HttpResponse.json(page(n, totalPages, byPage[n] ?? []));
    });
  }

  async function scrollTo(
    result: { current: ReturnType<typeof useExploreMovies> },
    expectedPages: number
  ) {
    for (let i = 1; i < expectedPages; i++) {
      act(() => result.current.fetchNextPage());
      await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false));
    }
  }

  it("shows a movie returned on two pages only once, at its first position", async () => {
    servePages({ 1: [11, 12, 13], 2: [13, 21, 22] });

    const { result } = setup(POPULAR);
    await loadFirstPage(result);
    await scrollTo(result, 2);

    expect(ids(result.current.movies)).toEqual([11, 12, 13, 21, 22]);
  });

  it("keeps the relative order of every other movie across several overlapping pages", async () => {
    servePages({ 1: [1, 2, 3], 2: [3, 4, 2], 3: [5, 1, 6] });

    const { result } = setup(POPULAR);
    await loadFirstPage(result);
    await scrollTo(result, 3);

    expect(ids(result.current.movies)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("keeps the data of the first appearance", async () => {
    serve((url) =>
      HttpResponse.json(
        pageOf(url) === 1
          ? { movies: [{ ...movie(12), title: "First sighting" }], page: 1, totalPages: 2 }
          : { movies: [{ ...movie(12), title: "Second sighting" }, movie(21)], page: 2, totalPages: 2 }
      )
    );

    const { result } = setup(POPULAR);
    await loadFirstPage(result);
    await scrollTo(result, 2);

    expect(result.current.movies.map((m) => m.title)).toEqual([
      "First sighting",
      "Movie 21",
    ]);
  });

  it("treats a page made only of already-shown movies as no change and no error", async () => {
    servePages({ 1: [11, 12], 2: [11, 12], 3: [31, 32] });

    const { result } = setup(POPULAR);
    await loadFirstPage(result);
    await scrollTo(result, 2);

    expect(ids(result.current.movies)).toEqual([11, 12]);
    expect(result.current.nextPageError).toBeNull();
    expect(result.current.firstPageError).toBeNull();
    // TMDB still reports a page 3, so loading goes on as usual (RF-11/RF-12).
    expect(result.current.hasNextPage).toBe(true);

    act(() => result.current.fetchNextPage());
    await waitFor(() =>
      expect(ids(result.current.movies)).toEqual([11, 12, 31, 32])
    );
  });

  it("leaves hasNextPage to TMDB's page info when the last page only repeats movies", async () => {
    servePages({ 1: [11, 12], 2: [11, 12] }, 2);

    const { result } = setup(POPULAR);
    await loadFirstPage(result);
    await scrollTo(result, 2);

    expect(ids(result.current.movies)).toEqual([11, 12]);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("returns a list without repeated ids, which is what unique React keys need", async () => {
    servePages({ 1: [1, 2, 3], 2: [2, 3, 4], 3: [4, 5, 1] });

    const { result } = setup(POPULAR);
    await loadFirstPage(result);
    await scrollTo(result, 3);

    const all = ids(result.current.movies);
    expect(new Set(all).size).toBe(all.length);
  });
});


// The home's hero movie rides on the popular list's first page (home-redesign
// RF-7, RF-11): the hook only hands it over; it never requests it by itself.
describe("useExploreMovies — featured movie", () => {
  const FEATURED = {
    id: 7,
    title: "Backdrop Movie",
    overview: "A story.",
    backdropUrl: "https://image.tmdb.org/t/p/original/bd.jpg",
    genreIds: [18, 53],
    releaseYear: 1999,
    rating: 8.4,
  };

  it("returns the first page's featured movie for the popular list (RF-7)", async () => {
    serve((url) =>
      HttpResponse.json({ ...standardPage(pageOf(url)), featured: FEATURED })
    );

    const { result } = setup(POPULAR);

    expect(result.current.featured).toBeNull();
    await loadFirstPage(result);
    expect(result.current.featured).toEqual(FEATURED);
  });

  it("returns null when the response has none (RF-9)", async () => {
    serve((url) => HttpResponse.json(standardPage(pageOf(url))));

    const { result } = setup(POPULAR);
    await loadFirstPage(result);

    expect(result.current.featured).toBeNull();
  });

  it("returns null for a filtered list", async () => {
    serve((url) => HttpResponse.json(standardPage(pageOf(url))));

    const { result } = setup(DRAMA);
    await loadFirstPage(result);

    expect(result.current.featured).toBeNull();
  });

  it("keeps the first page's featured movie after later pages load", async () => {
    serve((url) =>
      HttpResponse.json(
        pageOf(url) === 1
          ? { ...standardPage(1), featured: FEATURED }
          : standardPage(pageOf(url))
      )
    );

    const { result } = setup(POPULAR);
    await loadFirstPage(result);
    act(() => result.current.fetchNextPage());
    await waitFor(() => expect(ids(result.current.movies)).toEqual([11, 12, 21, 22]));

    expect(result.current.featured).toEqual(FEATURED);
  });

  it("returns the featured movie of a page the server already rendered, with no request (RF-7)", async () => {
    const calls = serve(() => HttpResponse.json(standardPage(1)));

    const { result } = setup(POPULAR, {
      filters: POPULAR,
      page: { ...page(1, 3, [901, 902]), featured: FEATURED },
    });

    expect(result.current.isFirstLoading).toBe(false);
    expect(result.current.featured).toEqual(FEATURED);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(calls).toHaveLength(0);
  });

  it("makes exactly one request when a page opened with filters goes back to the popular list (RF-7, RF-11)", async () => {
    const calls = serve(() =>
      HttpResponse.json({ ...standardPage(1), featured: FEATURED })
    );

    const { result, rerender } = setup(DRAMA, {
      filters: DRAMA,
      page: page(1, 3, [901, 902]),
    });
    expect(result.current.featured).toBeNull();
    expect(calls).toHaveLength(0);

    rerender({ f: POPULAR });

    expect(result.current.featured).toBeNull();
    await waitFor(() => expect(result.current.featured).toEqual(FEATURED));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(calls).toHaveLength(1);
    expect(pageOf(calls[0])).toBe(1);
    expect(calls[0].searchParams.has("genre")).toBe(false);
  });
});
