import { expect, test } from "@playwright/test";

/**
 * The goal card explains the Significance Threshold on request (#185).
 *
 * The unit suite already proves the disclosure toggles and is wired to
 * assistive technology. What it cannot prove is anything about the rendered
 * result: jsdom applies no stylesheet, so "the panel is in the document" and
 * "the panel is legible on screen" are the same assertion there, and they are
 * not the same thing (`CLAUDE.md`).
 *
 * **Contrast is NOT measured here.** Two earlier drafts got this wrong in
 * opposite directions. The first said `contrast-usage.spec.ts` covered the
 * panel "for free once it is on screen" — it did not, because that sweep never
 * clicked. The second added a private contrast helper to this file, and a duel
 * reviewer showed it lacked the ancestor-opacity walk and translucent-layer
 * compositing the sweep had spent four rounds acquiring: `opacity-50` on the
 * panel painted 2.32:1 and this file reported 7.46 and passed.
 *
 * Duplicated colour maths diverges from the hardened original. So the sweep now
 * opens disclosures itself (`revealDisclosures`) and measures the panel with
 * the same code that measures everything else, and this file measures no
 * colour at all. What it adds is that the panel appears with a real box, sits
 * below the caption it explains, works from the keyboard, and stays closed on
 * the sibling card.
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
const GOALS = {
  schemaVersion: 1,
  goals: [
    { id: "g1", name: "Laptop", price: 300, note: "", createdAt: 1 },
    { id: "g2", name: "Headphones", price: 200, note: "", createdAt: 2 },
  ],
};

const HINT = "Purchases above this % of your monthly income are flagged.";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    (d) => {
      window.localStorage.setItem("affordo.profile", JSON.stringify(d.p));
      window.localStorage.setItem("affordo.goals", JSON.stringify(d.g));
    },
    { p: PROFILE, g: GOALS },
  );
});

test("the explanation appears on screen, and clears the meter it explains", async ({
  page,
}) => {
  await page.goto("/goals");
  const card = page.locator("article", { hasText: "Laptop" });

  await expect(card.getByText(HINT)).toHaveCount(0);
  await card.getByRole("button", { name: /what this means/i }).click();

  const panel = card.getByText(HINT);
  await expect(panel).toBeVisible();

  // A real box, not a zero-height element that `toBeVisible` would still pass.
  const box = (await panel.boundingBox())!;
  expect(box.height).toBeGreaterThan(10);
  expect(box.width).toBeGreaterThan(50);

  // It must not cover the caption it explains — a floating tooltip would have
  // to solve this with positioning; a disclosure gets it from flow layout, and
  // this asserts that stays true.
  const caption = (await card
    .getByText(/significance threshold: 10%/i)
    .boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(caption.y + caption.height);
});

test("it is reachable and operable by keyboard alone", async ({ page }) => {
  await page.goto("/goals");
  const card = page.locator("article", { hasText: "Laptop" });
  const trigger = card.getByRole("button", { name: /what this means/i });

  await trigger.focus();
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(card.getByText(HINT)).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(card.getByText(HINT)).toHaveCount(0);
});

test("opening one card's explanation leaves the other closed", async ({
  page,
}) => {
  await page.goto("/goals");
  const first = page.locator("article", { hasText: "Laptop" });
  const second = page.locator("article", { hasText: "Headphones" });

  await first.getByRole("button", { name: /what this means/i }).click();

  await expect(first.getByText(HINT)).toBeVisible();
  await expect(second.getByText(HINT)).toHaveCount(0);
});
