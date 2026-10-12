import { describe, expect, it } from "vitest";
import { TmdbGenreListRawSchema, type Genre } from "./genre-schema";

describe("TmdbGenreListRawSchema", () => {
  it("parses a valid genre/movie/list response into Genre[]", () => {
    const parsed = TmdbGenreListRawSchema.parse({
      genres: [
        { id: 28, name: "Action" },
        { id: 18, name: "Drama" },
      ],
    });

    const genres: Genre[] = parsed.genres;
    expect(genres).toEqual([
      { id: 28, name: "Action" },
      { id: 18, name: "Drama" },
    ]);
  });

  it("ignores extra fields TMDB may add", () => {
    const parsed = TmdbGenreListRawSchema.parse({
      genres: [{ id: 28, name: "Action", extra: true }],
    });

    expect(parsed.genres).toEqual([{ id: 28, name: "Action" }]);
  });

  it("rejects a response without a genres array", () => {
    expect(TmdbGenreListRawSchema.safeParse({}).success).toBe(false);
    expect(TmdbGenreListRawSchema.safeParse({ genres: "Action" }).success).toBe(
      false
    );
  });

  it("rejects a genre with a wrong field type or missing field", () => {
    expect(
      TmdbGenreListRawSchema.safeParse({ genres: [{ id: "28", name: "Action" }] })
        .success
    ).toBe(false);
    expect(
      TmdbGenreListRawSchema.safeParse({ genres: [{ id: 28 }] }).success
    ).toBe(false);
  });
});
