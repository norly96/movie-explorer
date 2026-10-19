import { describe, expect, it } from "vitest";
import { firstGenreName } from "./featured-genre";

const GENRES = [
  { id: 28, name: "Action" },
  { id: 18, name: "Drama" },
  { id: 53, name: "Thriller" },
];

describe("firstGenreName (RF-6, RF-16)", () => {
  it("returns the name of the first id, in the movie's order", () => {
    expect(firstGenreName([53, 18], GENRES)).toBe("Thriller");
  });

  it("skips ids that are not in the list", () => {
    expect(firstGenreName([999, 18, 53], GENRES)).toBe("Drama");
  });

  it("returns null when the movie has no genre ids", () => {
    expect(firstGenreName([], GENRES)).toBeNull();
  });

  it("returns null when the genre list is empty, e.g. it failed to load", () => {
    expect(firstGenreName([18], [])).toBeNull();
  });

  it("returns null when none of the ids resolves", () => {
    expect(firstGenreName([998, 999], GENRES)).toBeNull();
  });
});
