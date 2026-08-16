import { expect, test } from "@playwright/test";

/**
 * The above-threshold flag is perceivable (#181, ADR 0027).
 *
 * This spec exists because the unit layer could not have caught what #180
 * found. jsdom applies no stylesheet, so `toHaveClass("text-accent")` was the
 * strongest assertion available — and it passed throughout, because the class
 * was always present and always correct. What was wrong was the colour it
 * resolved to: 3.10:1 against the card in light, *fainter* than the 7.44:1
 * calm state it replaced, and 7.12:1 against 7.16:1 in dark, luminance-
 * identical. A class name cannot express either fact.
 *
 * So this measures what the browser actually paints. `contrast.test.ts` guards
 * the tokens and this guards the pixels, because a token can be perfect and
 * still never reach the element — a wrong class, a lost cascade, a `dark:`
 * variant that does not apply.
 */
const PROFILE = {
  schemaVersion: 1,
  profile: {
    currency: "EUR",
    salary: 2000,
    hoursPerWeek: 40,
    hoursPerDay: 8,
    paymentsPerYear: 12,
    expenses: 500,
    threshold: 10,
    savings: 0,
    monthlyContribution: 0,
  },
};

/**
 * Two goals against a 2000 salary and a 10% threshold:
 * - Laptop at 300 is 15% — a breach.
 * - Headphones at 200 is exactly 10% — the boundary, which is strictly NOT a
 *   breach, so it renders the calm caption and gives us both states on one
 *   page with one profile.
 */
const GOALS = {
  schemaVersion: 1,
  goals: [
    { id: "g1", name: "Laptop", price: 300, note: "", createdAt: 1 },
    { id: "g2", name: "Headphones", price: 200, note: "", createdAt: 2 },
  ],
};

/**
 * WCAG 2.x relative luminance of what the browser actually paints.
 *
 * The conversion happens in-page, through a canvas, rather than by parsing the
 * computed string here. Chromium returns these tokens in their authored colour
 * space — `getComputedStyle(el).color` on a themed caption is literally
 * `oklch(0.985 0.002 60)`, not `rgb(...)`. A first draft of this file regexed
 * the three numbers out and divided by 255, which fed the *hue angle* 60 in as
 * a blue channel and silently produced nonsense; it passed the light-theme
 * assertion by luck and failed the dark one for the wrong reason.
 *
 * A canvas sidesteps the whole format question: fill one pixel and read it
 * back, and whatever colour space the token was written in, the bytes are the
 * sRGB a user's eye receives.
 */
async function luminanceOf(
  locator: import("@playwright/test").Locator,
): Promise<number> {
  return locator.evaluate((el) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.fillStyle = getComputedStyle(el).color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    const lin = (v: number) => {
      const x = v / 255;
      return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    (d) => {
      window.localStorage.setItem("affordo.profile", JSON.stringify(d.p));
      window.localStorage.setItem("affordo.goals", JSON.stringify(d.g));
    },
    { p: PROFILE, g: GOALS },
  );
});

test("the breached caption is painted heavier and darker than the calm one", async ({
  page,
}) => {
  await page.goto("/goals");

  const breached = page.getByText("Above significance threshold: 10%");
  const calm = page.getByText("Significance threshold: 10%", { exact: true });
  await expect(breached).toBeVisible();
  await expect(calm).toBeVisible();

  const weight = (l: typeof breached) =>
    l.evaluate((el) => Number(getComputedStyle(el).fontWeight));

  // Weight: the channel that survives greyscale and colour blindness.
  expect(await weight(breached)).toBeGreaterThan(await weight(calm));

  // Luminance: the channel #180 found running backwards. Against a light card
  // the breached caption must be the DARKER of the two, which is the direct
  // inverse of what the reference painted.
  expect(await luminanceOf(breached)).toBeLessThan(await luminanceOf(calm));
});

test("the two states are painted differently in dark mode too", async ({
  page,
}) => {
  // The theme that mattered most and was checked least. Both accent endpoints
  // cleared AA under `.dark`, which is why ADR 0022 case 4 called the failure
  // "light-only" — and they sat 0.04 apart, so the flag was invisible there
  // while every ratio in the suite passed.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/goals");

  const breached = page.getByText("Above significance threshold: 10%");
  const calm = page.getByText("Significance threshold: 10%", { exact: true });
  await expect(breached).toBeVisible();

  // Prove the theme actually flipped before measuring anything under it.
  // Without this the test is self-satisfying: `emulateMedia` only asks, and
  // the app answers through ThemeProvider's OS fallback (#73). Break that
  // fallback and the page renders LIGHT, where the two captions are also well
  // separated — so every assertion below would pass while the theme this test
  // is named for went unmeasured. A duel reviewer confirmed it on #182 by
  // stubbing the fallback out.
  await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);

  // Not a direction assertion — dark inverts which end is "darker". The claim
  // is that a real, measurable step exists at all, which 0.04 of contrast
  // was not.
  const step = Math.abs(
    (await luminanceOf(breached)) - (await luminanceOf(calm)),
  );
  expect(
    step,
    `only ${step.toFixed(3)} of luminance separates the two states`,
  ).toBeGreaterThan(0.05);
});

test("a goal exactly at the threshold is not flagged", async ({ page }) => {
  await page.goto("/goals");

  // Headphones is 200 of 2000 — exactly 10%. The engine's `>` is strict, and
  // this is the boundary the whole flag turns on.
  const card = page.locator("article", { hasText: "Headphones" });
  await expect(card.getByText("Significance threshold: 10%")).toBeVisible();
  await expect(card.getByText("Above significance threshold: 10%")).toHaveCount(
    0,
  );
});
