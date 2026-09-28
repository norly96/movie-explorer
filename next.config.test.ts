import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("next.config", () => {
  it("allows images from TMDB's image CDN", () => {
    const remotePatterns = nextConfig.images?.remotePatterns ?? [];

    const allowsTmdb = remotePatterns.some(
      (pattern) => "hostname" in pattern && pattern.hostname === "image.tmdb.org"
    );

    expect(allowsTmdb).toBe(true);
  });
});
