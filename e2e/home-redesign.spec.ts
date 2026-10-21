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

// Phase 3 (RF-18 to RF-26, RF-28, RF-36): the redesigned bar, the results
// heading, the back-to-top button and the cards, measured in a real browser.
type Box = { x: number; y: number; width: number; height: number };

async function box(locator: ReturnType<Page["locator"]>): Promise<Box> {
  const found = await locator.boundingBox();
  if (!found) throw new Error("element has no box");
  return found;
}

const searchField = (page: Page) => page.getByLabel("Search movies");
const selectors = (page: Page) => [
  page.getByLabel("Genre"),
  page.getByLabel("Year"),
  page.getByLabel("Sort by"),
];
const resultsHeading = (page: Page) =>
  page.getByTestId("results-anchor").getByRole("heading", { level: 2 });

// Picks "Drama" and waits for Clear filters to show. The server renders the page
// before React takes over, so a choice made in that gap is lost: try again until
// it takes.
async function chooseDrama(page: Page) {
  await expect(async () => {
    await page.getByLabel("Genre").selectOption({ label: "Drama" });
    await expect(
      page.getByRole("button", { name: "Clear filters" })
    ).toBeVisible({ timeout: 1000 });
  }).toPass();
}

async function openWithFilter(page: Page) {
  await page.goto("/");
  await page.getByRole("article").first().waitFor();
  await chooseDrama(page);
  await expect(resultsHeading(page)).toHaveText("Drama");
}

for (const { width, minHeight } of [
  { width: 1280, minHeight: 44 },
  { width: 390, minHeight: 48 },
]) {
  test.describe(`bar at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test(`controls are at least ${minHeight}px high, with 16px text in the field and selectors (RF-20)`, async ({
      page,
    }) => {
      await page.goto("/");
      await page.getByRole("article").first().waitFor();
      await chooseDrama(page);
      const clear = page.getByRole("button", { name: "Clear filters" });

      for (const control of [searchField(page), ...selectors(page), clear]) {
        expect((await box(control)).height).toBeGreaterThanOrEqual(minHeight);
      }
      for (const field of [searchField(page), ...selectors(page)]) {
        await expect(field).toHaveCSS("font-size", "16px");
      }
      await expect(clear).toHaveCSS("font-size", "14px");
    });

    test("showing and hiding Clear filters moves nothing (RF-19)", async ({
      page,
    }) => {
      await page.goto("/");
      await page.getByRole("article").first().waitFor();
      // Positions in the document, not the viewport: choosing a filter scrolls
      // the results to the top of the grid (explore-filters RF-19) on purpose.
      const inDocument = async (locator: ReturnType<Page["locator"]>) => {
        const b = await box(locator);
        const scrollY = await page.evaluate(() => window.scrollY);
        return { ...b, y: b.y + scrollY };
      };
      const measure = async () => ({
        search: await inDocument(searchField(page)),
        selects: await Promise.all(selectors(page).map((s) => inDocument(s))),
        heading: await inDocument(resultsHeading(page)),
      });

      const before = await measure();
      await chooseDrama(page);
      const withButton = await measure();
      await page.getByRole("button", { name: "Clear filters" }).click();
      await expect(
        page.getByRole("button", { name: "Clear filters" })
      ).toHaveCount(0);
      const after = await measure();

      expect(withButton).toEqual(before);
      expect(after).toEqual(before);
    });
  });
}

test.describe("bar layout (RF-18)", () => {
  test("is one row at 1280px", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openWithFilter(page);

    const tops = [
      await box(searchField(page)),
      ...(await Promise.all(selectors(page).map((s) => box(s)))),
      await box(page.getByRole("button", { name: "Clear filters" })),
    ].map((b) => Math.round(b.y));
    expect(new Set(tops).size).toBe(1);
  });

  test("is the search field on top of two columns at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWithFilter(page);

    const search = await box(searchField(page));
    const [genre, year, sort] = await Promise.all(selectors(page).map((s) => box(s)));
    const clear = await box(page.getByRole("button", { name: "Clear filters" }));

    expect(genre.y).toBeGreaterThan(search.y + search.height - 1);
    expect(Math.round(year.y)).toBe(Math.round(genre.y));
    expect(sort.y).toBeGreaterThan(genre.y + genre.height - 1);
    expect(Math.round(clear.y)).toBe(Math.round(sort.y));
    expect(Math.round(sort.x)).toBe(Math.round(genre.x));
    expect(Math.round(clear.x)).toBe(Math.round(year.x));
  });
});

test("draws no divider borders between the header, the bar and the results (RF-28)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.getByRole("article").first().waitFor();

  const widths = await page.evaluate(() => {
    const bar = document
      .querySelector('[data-slot="search-field"]')!
      .parentElement!;
    const elements = [
      document.querySelector("header")!,
      document.querySelector("header > div")!,
      bar,
      document.querySelector("main")!,
      document.querySelector('[data-testid="results-anchor"]')!,
      document.querySelector('[data-testid="results-anchor"] h2')!,
    ];
    return elements.map((el) => {
      const s = getComputedStyle(el);
      return [s.borderTopWidth, s.borderBottomWidth, s.borderLeftWidth, s.borderRightWidth];
    });
  });
  expect(widths.flat().every((w) => w === "0px")).toBe(true);
});

test("announces a search once it has loaded, politely (RF-22)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("article").first().waitFor();

  await searchField(page).fill("matrix");

  const live = page.locator('[role="status"][aria-live="polite"]');
  await expect(live).toHaveText("Results for “matrix”");
  await expect(resultsHeading(page)).toHaveText("Results for “matrix”");
  await expect(searchField(page)).toBeFocused();
});

test.describe("back to top (RF-24, RF-25, RF-26)", () => {
  for (const width of [1280, 390]) {
    test(`appears after scrolling, goes to the results heading and hides again at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await page.getByRole("article").first().waitFor();

      const button = page.getByRole("button", { name: "Back to top of results" });
      await expect(button).toHaveCount(0);

      await page.evaluate(() => window.scrollTo(0, 1200));
      await expect(button).toBeVisible();

      await button.click();
      await expect(resultsHeading(page)).toBeFocused();
      await expect(button).toHaveCount(0);
      // The scroll is smooth: wait for it to land with the heading near the top.
      await expect
        .poll(async () => {
          const { y } = await box(resultsHeading(page));
          return y >= 0 && y < 400;
        })
        .toBe(true);
    });

    test(`never covers the element that has keyboard focus at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await page.getByRole("article").first().waitFor();
      await page.evaluate(() => window.scrollTo(0, 1200));
      const button = page.getByRole("button", { name: "Back to top of results" });
      await expect(button).toBeVisible();

      // Start from the first card in view, then Tab through the ones after it.
      await page.evaluate(() => {
        const link = [...document.querySelectorAll("article")]
          .map((a) => a.closest("a")!)
          .find((a) => a.getBoundingClientRect().top > 100)!;
        link.focus({ preventScroll: true });
      });
      for (let i = 0; i < 24; i++) {
        await page.keyboard.press("Tab");
        const overlap = await page.evaluate(() => {
          const focused = document.activeElement as HTMLElement;
          const btn = document.querySelector(
            'button[aria-label="Back to top of results"]'
          ) as HTMLElement;
          // Past the last stop Tab leaves the page: nothing is focused.
          if (!focused || focused === btn || focused === document.body) return null;
          const visible = getComputedStyle(btn).visibility === "visible";
          if (!visible) return null;
          const a = focused.getBoundingClientRect();
          const b = btn.getBoundingClientRect();
          const covered = !(
            a.right <= b.left ||
            a.left >= b.right ||
            a.bottom <= b.top ||
            a.top >= b.bottom
          );
          return covered
            ? `${focused.tagName} ${[a.left, a.top, a.right, a.bottom].map(Math.round)} under the button ${[b.left, b.top, b.right, b.bottom].map(Math.round)}`
            : null;
        });
        expect(overlap, `Tab press ${i + 1}`).toBeNull();
      }
    });
  }
});

test.describe("cards", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("on hover show the gold border, the enlargement, unmoved neighbors and the topmost corners (RF-23)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("article").first().waitFor();
    const cards = page.getByRole("article");
    const boxes = () =>
      page.evaluate(() =>
        [...document.querySelectorAll("article")]
          .slice(0, 6)
          .map((a) => JSON.stringify(a.getBoundingClientRect().toJSON()))
      );

    const before = await boxes();
    await cards.nth(2).hover();
    const card = cards.nth(2);
    await expect(card).toHaveCSS("border-top-color", "rgb(245, 184, 61)");
    await expect(card).toHaveCSS("border-top-width", "2px");
    await expect(card).toHaveCSS("scale", "1.03");
    await expect(card.getByRole("heading")).toHaveCSS("color", "rgb(245, 184, 61)");
    await page.waitForTimeout(300);

    const after = await boxes();
    after.forEach((rect, index) => {
      if (index !== 2) expect(rect).toBe(before[index]);
    });
    const corners = await card.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [
        [r.left + 3, r.top + 3],
        [r.right - 3, r.top + 3],
        [r.left + 3, r.bottom - 3],
        [r.right - 3, r.bottom - 3],
      ].map(([x, y]) => el.contains(document.elementFromPoint(x, y)));
    });
    expect(corners).toEqual([true, true, true, true]);
  });

  test("do not enlarge on keyboard focus (RF-23)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("article").first().waitFor();

    await page.getByRole("article").nth(1).locator("xpath=ancestor::a").focus();

    await expect(page.getByRole("article").nth(1)).toHaveCSS("scale", "none");
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("keep the border but do not enlarge, and the skeletons stand still (RF-23, RF-36)", async ({
      page,
    }) => {
      await page.goto("/");
      await page.getByRole("article").first().waitFor();
      const card = page.getByRole("article").nth(1);

      await card.hover();
      await expect(card).toHaveCSS("border-top-color", "rgb(245, 184, 61)");
      await expect(card).toHaveCSS("scale", "none");

      await page.route("**/api/explore*", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await route.continue();
      });
      await page.getByLabel("Year").selectOption("1999");
      const skeleton = page.locator('[role="status"][aria-label="Loading movies"] > div').first();
      await expect(skeleton).toBeVisible();
      await expect(skeleton.locator("div").first()).toHaveCSS("animation-name", "none");
    });
  });

  test("skeletons pulse without reduced motion and are hidden from assistive technology (RF-36)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("article").first().waitFor();
    await page.route("**/api/explore*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await page.getByLabel("Year").selectOption("1999");
    const skeleton = page.locator('[role="status"][aria-label="Loading movies"] > div').first();
    await expect(skeleton).toBeVisible();

    await expect(skeleton).toHaveAttribute("aria-hidden", "true");
    await expect(skeleton.locator("div").first()).toHaveCSS("animation-name", "pulse");
  });
});
