import { afterEach, describe, expect, it, vi } from "vitest";

// "server-only" throws unconditionally when Vite resolves its default
// export condition (the "react-server" condition that makes it a no-op
// is set by Next.js's server bundler, not by Vitest). It exists purely
// as a build-time guard against client bundling, so it's irrelevant to
// this test's behavior — mocked out rather than exercised.
vi.mock("server-only", () => ({}));

const { getTmdbConfig } = await import("./tmdb-config");

describe("getTmdbConfig", () => {
  const originalToken = process.env.TMDB_ACCESS_TOKEN;

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.TMDB_ACCESS_TOKEN;
    } else {
      process.env.TMDB_ACCESS_TOKEN = originalToken;
    }
  });

  it("throws a clear error when TMDB_ACCESS_TOKEN is unset", () => {
    delete process.env.TMDB_ACCESS_TOKEN;
    expect(() => getTmdbConfig()).toThrow(/TMDB_ACCESS_TOKEN/);
  });

  it("throws a clear error when TMDB_ACCESS_TOKEN is empty", () => {
    process.env.TMDB_ACCESS_TOKEN = "";
    expect(() => getTmdbConfig()).toThrow(/TMDB_ACCESS_TOKEN/);
  });

  it("returns the token and TMDB URLs when set", () => {
    process.env.TMDB_ACCESS_TOKEN = "test-token";

    expect(getTmdbConfig()).toEqual({
      accessToken: "test-token",
      baseUrl: "https://api.themoviedb.org/3",
      imageBaseUrl: "https://image.tmdb.org/t/p/w500",
    });
  });
});
