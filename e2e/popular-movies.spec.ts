import { expect, test } from "@playwright/test";

// T19: happy path against the real TMDB API. Playwright's webServer
// runs `pnpm dev`, which loads .env.local the same as any dev
// session — no mocking at this layer (see plan.md's test strategy).
test("shows popular movies on the happy path (RF-1)", async ({ page }) => {
  await page.goto("/");

  const cards = page.getByRole("article");
  await expect(cards.first()).toBeVisible();

  const cardCount = await cards.count();
  expect(cardCount).toBeGreaterThan(0);
  expect(cardCount).toBeLessThanOrEqual(20);
});
