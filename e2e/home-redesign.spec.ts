import { expect, test, type Page } from "@playwright/test";

// The shell of the home redesign (RF-1, 2, 4, 5, 15, 30, 34): the header and the
// skip link on every page, one main area, the current page marked, the keyboard
// order and the narrow layout. Real browser against the dev server, like the
// other e2e specs; the movie pages use TMDB's real data.
const NAME = "Movie-explorer";

const PAGES = [
  { name: "home", path: "/", title: `${NAME}: browse popular movies` },
  { name: "about", path: "/about", title: `About | ${NAME}` },
  { name: "movie", path: "/movie/550", title: NAME },
  { name: "not-found movie", path: "/movie/999999999", title: NAME },
];

// The header layout that is displayed at the current width.
function shownHeader(page: Page) {
  return page.locator("header [data-variant]:visible");
}

for (const { name, path, title } of PAGES) {
  test.describe(`${name} page`, () => {
    test("has the header, the skip link and exactly one main area (RF-1, RF-5, RF-15)", async ({
      page,
    }) => {
      await page.goto(path);

      await expect(page.getByRole("banner")).toBeVisible();
      await expect(shownHeader(page).getByRole("link", { name: `${NAME}, home` })).toBeVisible();
      await expect(page.getByRole("link", { name: "Skip to content" })).toHaveCount(1);
      await expect(page.locator("main")).toHaveCount(1);
    });

    test("has its own title (RF-34)", async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveTitle(title);
    });

    test("the first Tab focuses the skip link and Enter moves focus to the main area (RF-5)", async ({
      page,
    }) => {
      await page.goto(path);

      await page.keyboard.press("Tab");
      const skip = page.getByRole("link", { name: "Skip to content" });
      await expect(skip).toBeFocused();
      await expect(skip).toBeVisible();

      await page.keyboard.press("Enter");
      await expect(page.locator("main")).toBeFocused();
    });
  });
}

test("marks the current page in the navigation (RF-2)", async ({ page }) => {
  const current = () => shownHeader(page).locator('nav a[aria-current="page"]');

  await page.goto("/");
  await expect(current()).toHaveText("Home");
  await expect(current()).toHaveCount(1);

  await page.goto("/about");
  await expect(current()).toHaveText("About");
  await expect(current()).toHaveCount(1);

  await page.goto("/movie/550");
  await expect(current()).toHaveCount(0);
});

for (const width of [390, 1280]) {
  test(`the tab order of the header equals its visual order at ${width}px (RF-4)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/about");

    // Skip link, then every link of the shown header.
    const inHeader = await shownHeader(page).getByRole("link").count();
    const positions: { text: string; top: number; left: number }[] = [];

    await page.keyboard.press("Tab"); // the skip link
    for (let i = 0; i < inHeader; i++) {
      await page.keyboard.press("Tab");
      positions.push(
        await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          const box = el.getBoundingClientRect();
          return {
            text: el.getAttribute("aria-label") ?? el.textContent ?? "",
            top: box.top + box.height / 2,
            left: box.left,
          };
        })
      );
    }

    // Reading order: a row at a time (rows are told apart by more than half a
    // control's height), left to right inside each row.
    const rowOf = (top: number) => Math.round(top / 30);
    const reading = [...positions].sort(
      (a, b) => rowOf(a.top) - rowOf(b.top) || a.left - b.left
    );
    expect(positions.map((p) => p.text)).toEqual(reading.map((p) => p.text));
    expect(positions).toHaveLength(inHeader);
    expect(positions[0].text).toBe(`${NAME}, home`);
  });
}

test("has no horizontal scroll at 320px, with the brand's text hidden (RF-4)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });

  for (const path of ["/", "/about"]) {
    await page.goto(path);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // Hidden visually, still named: the text is reduced to a 1px clipped box.
    const text = shownHeader(page).getByText(NAME, { exact: true });
    const box = await text.boundingBox();
    expect(box === null || box.width <= 1).toBe(true);
    await expect(
      shownHeader(page).getByRole("link", { name: `${NAME}, home` })
    ).toBeVisible();
  }
});

test.describe("with JavaScript disabled", () => {
  test.use({ javaScriptEnabled: false });

  test("still shows the header and the skip link (RF-30)", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("link", { name: "Skip to content" })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "About" }).first()).toBeVisible();
  });

  test("still shows the About page with the TMDB notice (RF-30)", async ({ page }) => {
    await page.goto("/about");

    await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();
    await expect(
      page.getByText(
        "This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB."
      )
    ).toBeVisible();
  });
});
