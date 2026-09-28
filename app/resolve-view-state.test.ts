import { describe, expect, it } from "vitest";
import type { Movie } from "../services/schemas/movie-schema";
import type { ServiceResult } from "../services/tmdb-service";
import { resolveViewState } from "./resolve-view-state";

const MOVIE: Movie = {
  id: 550,
  title: "Fight Club",
  posterUrl: null,
  releaseYear: 1999,
  rating: 8.4,
};

describe("resolveViewState", () => {
  it("resolves an empty array to kind: empty (RF-4)", () => {
    const result: ServiceResult<Movie[]> = { ok: true, data: [] };
    expect(resolveViewState(result)).toEqual({ kind: "empty" });
  });

  it("resolves a non-empty array to kind: grid (RF-1)", () => {
    const result: ServiceResult<Movie[]> = { ok: true, data: [MOVIE] };
    expect(resolveViewState(result)).toEqual({ kind: "grid", movies: [MOVIE] });
  });

  it("resolves ok:false to kind: error with a message (RF-5)", () => {
    const result: ServiceResult<Movie[]> = {
      ok: false,
      error: { reason: "network" },
    };
    const viewState = resolveViewState(result);

    expect(viewState.kind).toBe("error");
    expect(viewState).toHaveProperty("message");
    expect(typeof (viewState as { message: string }).message).toBe("string");
  });
});
