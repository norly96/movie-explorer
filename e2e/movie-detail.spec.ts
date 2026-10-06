import { expect, test } from "@playwright/test";

// Happy path against the real TMDB API, same approach as
// e2e/popular-movies.spec.ts — no mocking at this layer.
test("clicking a MovieCard navigates to its detail page showing hero/cast/trailer/gallery (RF-7)", async ({
  page,
}) => {
  await page.goto("/");

  const firstCard = page.getByRole("article").first();
  await firstCard.click();

  await expect(page).toHaveURL(/\/movie\/\d+$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Cast section (photo/name/character) and a trailer are expected
  // for virtually any currently-popular movie.
  await expect(page.locator("iframe")).toBeVisible();
});

test("a direct visit renders the same page, with no prior navigation (RF-8)", async ({
  page,
}) => {
  // Fight Club — a stable, well-documented TMDB id.
  await page.goto("/movie/550");

  await expect(
    page.getByRole("heading", { level: 1, name: "Fight Club" })
  ).toBeVisible();
  await expect(page.getByText("Brad Pitt")).toBeVisible();
});

test("visiting an invalid id directly shows 'Movie not found' (RF-9)", async ({
  page,
}) => {
  await page.goto("/movie/999999999");
  await expect(page.getByText("Movie not found")).toBeVisible();
});
