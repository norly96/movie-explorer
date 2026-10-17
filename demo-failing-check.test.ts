import { describe, expect, it } from "vitest";

// Throwaway demonstration for specs/deploy-ci (demonstration 1): a red check
// must block the merge. This pull request is closed without merging.
describe("demonstration", () => {
  it("fails on purpose", () => {
    expect(1 + 1).toBe(3);
  });
});
