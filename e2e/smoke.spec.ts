import { test, expect } from "@playwright/test";

// Placeholder test with no app logic: only proves the Playwright
// toolchain (browser, runner, config) works. Superseded by
// e2e/popular-movies.spec.ts in task T19, not deleted until then.
test("Playwright itself is wired up correctly", async ({ page }) => {
  await page.goto("about:blank");
  await expect(page).toHaveURL("about:blank");
});
