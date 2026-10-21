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
// The results heading, told apart from the hero's title (also a level-two one).
const resultsHeading = (page: Page) =>
  page.locator('[data-slot="results-heading"]');

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
  // The hero above rolls up over 400 ms; measure once it is gone.
  await expect
    .poll(async () => {
      const hero = page.locator('[data-slot="hero-curtain"]');
      return (await hero.count()) === 0 ? 0 : (await hero.boundingBox())?.height ?? 0;
    })
    .toBe(0);
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
      // Positions inside the bar and below it, measured from the search field: the
      // hero above rolls up when a filter is chosen (a curtain of 400 ms), which
      // moves the whole bar and is not what is being checked here.
      const measure = async () => {
        const origin = await box(searchField(page));
        const scrollY = await page.evaluate(() => window.scrollY);
        const relative = async (locator: ReturnType<Page["locator"]>) => {
          const b = await box(locator);
          return { x: b.x - origin.x, y: b.y - origin.y, w: b.width, h: b.height };
        };
        return {
          search: await relative(searchField(page)),
          selects: await Promise.all(selectors(page).map((s) => relative(s))),
          heading: await relative(resultsHeading(page)),
          scrolled: scrollY >= 0,
        };
      };

      await page.waitForTimeout(600);
      const before = await measure();
      await chooseDrama(page);
      await page.waitForTimeout(700);
      const withButton = await measure();
      await page.getByRole("button", { name: "Clear filters" }).click();
      await expect(
        page.getByRole("button", { name: "Clear filters" })
      ).toHaveCount(0);
      await page.waitForTimeout(700);
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

  const live = page.locator('[role="status"][aria-live="polite"]');
  // Typed before React has taken over, the text is lost: try again until it takes.
  // (Emptied first each time: filling the same text again sends no new event.)
  await expect(async () => {
    await searchField(page).fill("");
    await searchField(page).fill("matrix");
    await expect(live).toHaveText("Results for “matrix”", { timeout: 2000 });
  }).toPass();
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
    // The cards start below the hero: bring the first row into the window, and
    // measure in the document so that the page's own scroll is not a movement.
    await page.evaluate(() => window.scrollTo(0, 450));
    const boxes = () =>
      page.evaluate(() =>
        [...document.querySelectorAll("article")].slice(0, 6).map((a) => {
          const r = a.getBoundingClientRect();
          return JSON.stringify([r.left, r.top + window.scrollY, r.width, r.height]);
        })
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

// Phase 4 (RF-6, 8, 9, 11 to 17): the featured hero, in a real browser against
// the real list.
const hero = (page: Page) => page.locator("section").filter({ has: page.getByRole("link", { name: /^Details of / }) });
const heroCurtain = (page: Page) => page.locator('[data-slot="hero-curtain"]');
const heroHeight = async (page: Page) =>
  (await heroCurtain(page).count()) === 0
    ? 0
    : ((await heroCurtain(page).boundingBox())?.height ?? 0);

// Text typed before React has taken over is lost: try again until it takes.
async function typeInSearch(page: Page, text: string) {
  await expect(async () => {
    await searchField(page).fill("");
    await searchField(page).fill(text);
    await expect(searchField(page)).toHaveValue(text);
    await expect(heroCurtain(page)).toHaveAttribute("inert", "", { timeout: 1500 });
  }).toPass();
}

test.describe("the hero (wide)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("is visible on the home, the featured movie is also a card, and Details opens its page (RF-6, RF-8)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("article").first().waitFor();

    await expect(hero(page)).toBeVisible();
    const details = hero(page).getByRole("link", { name: /^Details of / });
    const href = await details.getAttribute("href");
    expect(href).toMatch(/^\/movie\/\d+$/);

    // The featured movie is not taken out of the grid.
    const card = page.locator(`a[href="${href}"]`).filter({ has: page.getByRole("article") });
    await expect(card).toHaveCount(1);
    const cardTitle = await card.getByRole("heading", { level: 3 }).textContent();
    expect(cardTitle).toBe(await hero(page).getByRole("heading", { level: 2 }).textContent());

    await details.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("shows only data the movie has, with an empty-description image loaded eagerly (RF-16, RF-17)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("article").first().waitFor();

    const section = hero(page);
    // The year and the rating (or "No rating") are always part of the data line.
    await expect(section.locator(".tabular-nums").first()).toContainText(/(19|20)\d{2}/);
    await expect(
      section.getByLabel(/^Rated \d(\.\d)? out of 10$/).or(section.getByText("No rating"))
    ).toHaveCount(1);
    const image = section.locator("img");
    await expect(image).toHaveAttribute("alt", "");
    await expect(image).toHaveAttribute("fetchpriority", "high");
    await expect(image).not.toHaveAttribute("loading", "lazy");
  });

  test("is capitalized by style while its accessible name is as written (RF-14)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("article").first().waitFor();

    const title = hero(page).getByRole("heading", { level: 2 });
    await expect(title).toHaveCSS("text-transform", "uppercase");
    const written = (await title.textContent()) ?? "";
    await expect(hero(page).getByRole("heading", { level: 2, name: written, exact: true })).toBeVisible();
    // Never typed in capitals: the text in the page is the title as TMDB has it.
    const displayed = await title.evaluate((el) => (el as HTMLElement).innerText);
    expect(displayed).toBe(written.toUpperCase());
  });

  test("keeps one level-one heading and no skipped levels (RF-15)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("article").first().waitFor();

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const levels = await page.evaluate(() =>
      [...document.querySelectorAll("h1, h2, h3")]
        .filter((h) => !h.closest("article"))
        .map((h) => Number(h.tagName[1]))
    );
    expect(levels[0]).toBe(1);
    levels.slice(1).forEach((level, i) => expect(level - levels[i]).toBeLessThanOrEqual(1));
  });

  test("closes with one typed character and comes back when it is erased (RF-11, RF-12)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("article").first().waitFor();
    expect(await heroHeight(page)).toBeGreaterThan(200);

    await typeInSearch(page, "m");
    await expect.poll(() => heroHeight(page)).toBe(0);
    await expect(heroCurtain(page)).toHaveAttribute("aria-hidden", "true");

    await searchField(page).fill("");
    await expect(heroCurtain(page)).not.toHaveAttribute("inert", "");
    await expect.poll(() => heroHeight(page)).toBeGreaterThan(200);
  });

  test("closes with a filter and comes back when the filters are cleared (RF-11)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("article").first().waitFor();

    await chooseDrama(page);
    await expect.poll(() => heroHeight(page)).toBe(0);
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect.poll(() => heroHeight(page)).toBeGreaterThan(200);
    await expect(hero(page)).toBeVisible();
  });

  test("leaves the search bar at the top edge, with the results right below, 450 ms after a filter (RF-12)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("article").first().waitFor();
    await page.waitForTimeout(500);

    await expect(async () => {
      await page.getByLabel("Genre").selectOption({ label: "Drama" });
      await expect(resultsHeading(page)).toHaveText("Drama", { timeout: 1500 });
    }).toPass();
    await page.waitForTimeout(500);

    const field = await box(searchField(page));
    const heading = await box(resultsHeading(page));
    expect(field.y).toBeGreaterThanOrEqual(0);
    expect(field.y).toBeLessThan(100);
    expect(heading.y).toBeGreaterThan(field.y);
    expect(heading.y).toBeLessThan(field.y + 200);
  });

  test("moves focus from Details to the search field when the hero closes (RF-13)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("article").first().waitFor();
    const details = hero(page).getByRole("link", { name: /^Details of / });

    await expect(async () => {
      await details.focus();
      await expect(details).toBeFocused();
      // The text arrives without a click on the field, as a script would send it,
      // so focus is still inside the hero when it closes.
      await searchField(page).evaluate((input: HTMLInputElement) => {
        const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
        set.call(input, "m");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await expect(heroCurtain(page)).toHaveAttribute("inert", "", { timeout: 1500 });
    }).toPass();

    await expect(searchField(page)).toBeFocused();
  });

  test("is unreachable by keyboard and assistive technology while closed (RF-13)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("article").first().waitFor();
    await typeInSearch(page, "m");

    await expect(page.getByRole("link", { name: /^Details of / })).toHaveCount(0);
    await searchField(page).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Genre")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    // Backwards from the field, focus leaves the page's content instead of
    // landing on the hidden hero's link.
    expect(
      await page.evaluate(() => document.activeElement?.textContent?.startsWith("Details"))
    ).not.toBe(true);
  });

  test("shows no hero and reserves nothing when the list cannot be loaded (RF-9)", async ({
    page,
  }) => {
    await page.goto("/?genre=18");
    await page.getByRole("article").first().waitFor();
    await expect(heroCurtain(page)).toHaveCount(0);

    await page.route("**/api/explore*", (route) => route.abort());
    await expect(async () => {
      await page.getByRole("button", { name: "Clear filters" }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: "Couldn't load movies" })
      ).toBeVisible({ timeout: 1500 });
    }).toPass();

    await expect(heroCurtain(page)).toHaveCount(0);
    await expect(page.locator("section").filter({ has: page.getByRole("link", { name: /^Details of / }) })).toHaveCount(0);
    await expect(searchField(page)).toBeVisible();
    await expect(page.getByLabel("Genre")).toBeVisible();
  });
});

test.describe("the hero (narrow)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("puts the image on top at 16:9 and the text below, with a full-width Details button (RF-6)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("article").first().waitFor();

    const image = await box(hero(page).locator('[data-slot="hero-image"]'));
    const title = await box(hero(page).getByRole("heading", { level: 2 }));
    const details = await box(hero(page).getByRole("link", { name: /^Details of / }));
    expect(Math.abs(image.width / image.height - 16 / 9)).toBeLessThan(0.02);
    expect(title.y).toBeGreaterThanOrEqual(image.y + image.height - 1);
    expect(details.height).toBeGreaterThanOrEqual(48);
    expect(details.width).toBeGreaterThan(300);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("the hero with reduced motion", () => {
  test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });

  test("closes and settles at once, without a curtain (RF-12)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("article").first().waitFor();
    await page.waitForTimeout(300);
    await expect(heroCurtain(page)).toHaveCSS("transition-property", "none");

    await expect(async () => {
      await page.getByLabel("Genre").selectOption({ label: "Drama" });
      await expect(resultsHeading(page)).toHaveText("Drama", { timeout: 1500 });
    }).toPass();

    // No 400 ms wait: the hero is gone and the bar is at the top straight away.
    await expect.poll(() => heroHeight(page), { timeout: 400 }).toBe(0);
    await expect
      .poll(async () => (await box(searchField(page))).y, { timeout: 400 })
      .toBeLessThan(100);
  });
});

test.describe("the hero with JavaScript disabled", () => {
  test.use({ javaScriptEnabled: false });

  test("is still shown on the home, with its text and its Details link (RF-30)", async ({
    page,
  }) => {
    await page.goto("/");

    const section = page.locator("section").filter({ has: page.getByRole("link", { name: /^Details of / }) });
    await expect(section).toBeVisible();
    await expect(section.getByRole("heading", { level: 2 })).toBeVisible();
    await expect(section.getByRole("link", { name: /^Details of / })).toHaveAttribute(
      "href",
      /^\/movie\/\d+$/
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });
});
