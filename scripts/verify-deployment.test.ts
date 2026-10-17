import { readFileSync } from "node:fs";
import { HttpResponse, delay, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../mocks/server";
import { verifyDeployment } from "./verify-deployment";

const TARGET = "https://deploy.example.test";
const HOME_URL = `${TARGET}/`;
const API_URL = `${TARGET}/api/explore`;

const OPTIONS = { timeoutMs: 1000 };

const HEALTHY_PAGE = {
  movies: [
    {
      id: 550,
      title: "Fight Club",
      posterUrl: null,
      releaseYear: 1999,
      rating: 8.4,
    },
  ],
  page: 1,
  totalPages: 5,
};

function serveHome(respond: () => Response | Promise<Response>) {
  server.use(http.get(HOME_URL, respond));
}

function serveApi(respond: () => Response | Promise<Response>) {
  server.use(http.get(API_URL, respond));
}

function serveHealthy() {
  serveHome(() => new HttpResponse("<html></html>", { status: 200 }));
  serveApi(() => HttpResponse.json(HEALTHY_PAGE));
}

describe("verifyDeployment", () => {
  it("is healthy when both probes succeed and the API returns movies (RF-13)", async () => {
    serveHealthy();

    const result = await verifyDeployment(TARGET, OPTIONS);

    expect(result.healthy).toBe(true);
    expect(result.target).toBe(TARGET);
    expect(result.probes).toEqual([
      { probe: "home", url: HOME_URL, ok: true, status: 200, detail: "" },
      {
        probe: "movie-list-api",
        url: `${API_URL}?page=1`,
        ok: true,
        status: 200,
        detail: "",
      },
    ]);
  });

  it("requests the first page of the movie-list API", async () => {
    serveHome(() => new HttpResponse("ok"));
    const seen: URL[] = [];
    server.use(
      http.get(API_URL, ({ request }) => {
        seen.push(new URL(request.url));
        return HttpResponse.json(HEALTHY_PAGE);
      })
    );

    await verifyDeployment(TARGET, OPTIONS);

    expect(seen).toHaveLength(1);
    expect(seen[0].searchParams.get("page")).toBe("1");
  });

  it("is unhealthy when the home page answers 5xx, and still probes the API (RF-14)", async () => {
    serveHome(() => new HttpResponse(null, { status: 500 }));
    serveApi(() => HttpResponse.json(HEALTHY_PAGE));

    const result = await verifyDeployment(TARGET, OPTIONS);

    expect(result.healthy).toBe(false);
    expect(result.probes[0]).toMatchObject({
      probe: "home",
      ok: false,
      status: 500,
    });
    expect(result.probes[0].detail).toContain("500");
    expect(result.probes[1]).toMatchObject({ probe: "movie-list-api", ok: true });
  });

  it("is unhealthy when the movie-list API answers 5xx (RF-14)", async () => {
    serveHome(() => new HttpResponse("ok"));
    serveApi(() =>
      HttpResponse.json({ reason: "http", status: 401 }, { status: 502 })
    );

    const result = await verifyDeployment(TARGET, OPTIONS);

    expect(result.healthy).toBe(false);
    expect(result.probes[1]).toMatchObject({
      probe: "movie-list-api",
      ok: false,
      status: 502,
    });
    expect(result.probes[1].detail).toContain("502");
  });

  it("is unhealthy when the API returns an empty movies array (RF-13)", async () => {
    serveHome(() => new HttpResponse("ok"));
    serveApi(() => HttpResponse.json({ movies: [], page: 1, totalPages: 0 }));

    const result = await verifyDeployment(TARGET, OPTIONS);

    expect(result.healthy).toBe(false);
    expect(result.probes[1]).toMatchObject({ ok: false, status: 200 });
    expect(result.probes[1].detail).toMatch(/no movie/i);
  });

  it("is unhealthy when the API body is not the expected shape (RF-14)", async () => {
    serveHome(() => new HttpResponse("ok"));

    for (const body of [{ nonsense: true }, { movies: "nope" }, [], null]) {
      serveApi(() => HttpResponse.json(body));

      const result = await verifyDeployment(TARGET, OPTIONS);

      expect(result.healthy).toBe(false);
      expect(result.probes[1].ok).toBe(false);
      expect(result.probes[1].detail).toMatch(/shape|movies/i);
    }
  });

  it("is unhealthy when the API body is not valid JSON (RF-14)", async () => {
    serveHome(() => new HttpResponse("ok"));
    serveApi(() => new HttpResponse("<html>oops</html>", { status: 200 }));

    const result = await verifyDeployment(TARGET, OPTIONS);

    expect(result.healthy).toBe(false);
    expect(result.probes[1]).toMatchObject({ ok: false, status: 200 });
    expect(result.probes[1].detail).toMatch(/json/i);
  });

  it("reports a network error with no status (RF-14)", async () => {
    serveHome(() => HttpResponse.error());
    serveApi(() => HttpResponse.error());

    const result = await verifyDeployment(TARGET, OPTIONS);

    expect(result.healthy).toBe(false);
    for (const probe of result.probes) {
      expect(probe.ok).toBe(false);
      expect(probe.status).toBeNull();
      expect(probe.detail).toMatch(/network/i);
    }
  });

  it("applies the timeout to each request separately (RF-14)", async () => {
    serveHome(async () => {
      await delay("infinite");
      return new HttpResponse("never");
    });
    serveApi(async () => {
      await delay("infinite");
      return HttpResponse.json(HEALTHY_PAGE);
    });

    const result = await verifyDeployment(TARGET, { timeoutMs: 50 });

    expect(result.healthy).toBe(false);
    for (const probe of result.probes) {
      expect(probe.ok).toBe(false);
      expect(probe.status).toBeNull();
      expect(probe.detail).toMatch(/timed out/i);
    }
  });

  it("a slow API does not stop the home page from being reported", async () => {
    serveHome(() => new HttpResponse("ok"));
    serveApi(async () => {
      await delay("infinite");
      return HttpResponse.json(HEALTHY_PAGE);
    });

    const result = await verifyDeployment(TARGET, { timeoutMs: 50 });

    expect(result.probes[0]).toMatchObject({ probe: "home", ok: true });
    expect(result.probes[1]).toMatchObject({ probe: "movie-list-api", ok: false });
  });

  it("ignores trailing slashes in the target", async () => {
    serveHealthy();

    const result = await verifyDeployment(`${TARGET}//`, OPTIONS);

    expect(result.healthy).toBe(true);
    expect(result.target).toBe(TARGET);
    expect(result.probes[0].url).toBe(HOME_URL);
    expect(result.probes[1].url).toBe(`${API_URL}?page=1`);
  });

  it("always reports exactly two probes in a fixed order", async () => {
    serveHome(() => HttpResponse.error());
    serveApi(() => HttpResponse.error());

    const result = await verifyDeployment(TARGET, OPTIONS);

    expect(result.probes.map((probe) => probe.probe)).toEqual([
      "home",
      "movie-list-api",
    ]);
  });

  it("is single-shot: one request per probe, no retries inside the library", async () => {
    const homeHits = vi.fn(() => new HttpResponse(null, { status: 500 }));
    const apiHits = vi.fn(() => new HttpResponse(null, { status: 500 }));
    serveHome(homeHits);
    serveApi(apiHits);

    await verifyDeployment(TARGET, OPTIONS);

    expect(homeHits).toHaveBeenCalledTimes(1);
    expect(apiHits).toHaveBeenCalledTimes(1);
  });

  it("uses the injected fetch instead of the global one", async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      return url.includes("/api/explore")
        ? Response.json(HEALTHY_PAGE)
        : new Response("ok");
    });

    const result = await verifyDeployment(TARGET, {
      timeoutMs: 1000,
      fetchFn: fetchFn as typeof fetch,
    });

    expect(result.healthy).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe("verify-deployment.ts source", () => {
  const source = readFileSync("scripts/verify-deployment.ts", "utf-8");

  it("imports nothing outside Node built-ins, so a workflow needs no install step", () => {
    const importedModules = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (match) => match[1]
    );

    for (const specifier of importedModules) {
      expect(specifier.startsWith("node:")).toBe(true);
    }
  });

  it("uses only erasable TypeScript syntax, so Node can run it without a build step", () => {
    expect(source).not.toMatch(/\benum\s+\w+/);
    expect(source).not.toMatch(/\bnamespace\s+\w+/);
    expect(source).not.toMatch(/constructor\s*\([^)]*\b(public|private|protected|readonly)\b/);
  });
});
