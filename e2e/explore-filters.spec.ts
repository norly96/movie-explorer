import { expect, test, type Page } from "@playwright/test";

// Real TMDB API, no mocking at this layer — same approach as
// e2e/popular-movies.spec.ts and e2e/movie-detail.spec.ts. Assertions
// compare against what the same app shows elsewhere (e.g. the popular
// list) instead of hardcoding TMDB data that changes daily.

const cards = (page: Page) => page.getByRole("article");

async function titles(page: Page): Promise<string[]> {
  return cards(page).locator("h3").allTextContents();
}

async function popularTitles(page: Page): Promise<string[]> {
  await page.goto("/");
  await expect(cards(page).first()).toBeVisible();
  return titles(page);
}

test("selecting a genre narrows the grid and updates the URL (RF-2, RF-8)", async ({
  page,
}) => {
  const popular = await popularTitles(page);

  await page.getByLabel("Genre").selectOption({ label: "Drama" });

  await expect(page).toHaveURL(/[?&]genre=18(&|$)/);
  await expect(page.getByLabel("Genre")).toHaveValue("18");
  await expect
    .poll(async () => (await titles(page)).join("|"))
    .not.toBe(popular.join("|"));
  await expect(cards(page).first()).toBeVisible();
});

test("typing a known title finds it and clears any active filter (RF-6, RF-7)", async ({
  page,
}) => {
  await page.goto("/?genre=18&year=1999");
  await expect(cards(page).first()).toBeVisible();

  await page.getByLabel("Search movies").fill("Fight Club");

  await expect(page).toHaveURL(/[?&]q=Fight\+Club(&|$)/);
  await expect(page).not.toHaveURL(/genre=|year=/);
  await expect(page.getByLabel("Genre")).toHaveValue("");
  await expect(page.getByLabel("Year")).toHaveValue("");
  await expect(
    page.getByRole("heading", { level: 3, name: "Fight Club" }).first()
  ).toBeVisible();
});

test("scrolling near the bottom loads another page (RF-11)", async ({ page }) => {
  await page.goto("/");
  await expect(cards(page).first()).toBeVisible();
  const firstPageCount = await cards(page).count();

  await expect
    .poll(async () => {
      await page.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight)
      );
      return cards(page).count();
    })
    .toBeGreaterThan(firstPageCount);
});

test("opening a filtered URL directly reproduces the same results (RF-9)", async ({
  page,
}) => {
  await page.goto("/");
  await expect(cards(page).first()).toBeVisible();
  await page.getByLabel("Genre").selectOption({ label: "Drama" });
  await page.getByLabel("Year").selectOption("1999");
  await expect(page).toHaveURL(/genre=18&year=1999/);
  await expect(cards(page).first()).toBeVisible();
  await expect
    .poll(async () => (await titles(page)).length)
    .toBeGreaterThan(0);
  const viaUi = (await titles(page)).sort();
  const url = page.url();

  // A fresh load of that exact URL, with no prior navigation.
  await page.goto(url);

  await expect(page.getByLabel("Genre")).toHaveValue("18");
  await expect(page.getByLabel("Year")).toHaveValue("1999");
  await expect(cards(page).first()).toBeVisible();
  expect((await titles(page)).sort()).toEqual(viaUi);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("a filtered URL is already server-rendered (RF-9, constitution §3)", async ({
    page,
  }) => {
    await page.goto("/?genre=18&year=1999");

    await expect(cards(page).first()).toBeVisible();
    expect(await cards(page).count()).toBeGreaterThan(0);
    await expect(page.getByLabel("Genre")).toHaveValue("18");
    await expect(page.getByLabel("Year")).toHaveValue("1999");
  });
});

test("an invalid filter param degrades gracefully to the popular list (RF-10)", async ({
  page,
}) => {
  const popular = (await popularTitles(page)).sort();

  await page.goto("/?genre=abc&year=99&sort=banana&q=a");

  await expect(cards(page).first()).toBeVisible();
  // (Not getByRole("alert"): Next's route announcer also has that role.)
  await expect(page.getByText(/Couldn't load/)).toHaveCount(0);
  await expect(page.getByLabel("Genre")).toHaveValue("");
  await expect(page.getByLabel("Year")).toHaveValue("");
  await expect(page.getByLabel("Sort by")).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Clear filters" })
  ).toHaveCount(0);
  expect((await titles(page)).sort()).toEqual(popular);
});

test("clicking 'Clear filters' returns to the popular list (RF-17)", async ({
  page,
}) => {
  const popular = (await popularTitles(page)).sort();
  await page.goto("/?genre=18&year=1999");
  await expect(cards(page).first()).toBeVisible();

  await page.getByRole("button", { name: "Clear filters" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("Genre")).toHaveValue("");
  await expect(page.getByLabel("Year")).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Clear filters" })
  ).toHaveCount(0);
  await expect
    .poll(async () => (await titles(page)).sort().join("|"))
    .toBe(popular.join("|"));
});

test("browser back after several changes leaves the explorer in one step (RF-20)", async ({
  page,
}) => {
  await page.goto("/movie/550");
  await expect(
    page.getByRole("heading", { level: 1, name: "Fight Club" })
  ).toBeVisible();

  await page.goto("/");
  await expect(cards(page).first()).toBeVisible();
  await page.getByLabel("Genre").selectOption({ label: "Drama" });
  await expect(page).toHaveURL(/genre=18/);
  await page.getByLabel("Year").selectOption("1999");
  await expect(page).toHaveURL(/genre=18&year=1999/);
  await page.getByLabel("Search movies").fill("matrix");
  await expect(page).toHaveURL(/[?&]q=matrix(&|$)/);

  await page.goBack();

  // Every change replaced the history entry, so one step back is the
  // page the visitor was on before — not an intermediate filter state.
  await expect(page).toHaveURL(/\/movie\/550$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Fight Club" })
  ).toBeVisible();
});
