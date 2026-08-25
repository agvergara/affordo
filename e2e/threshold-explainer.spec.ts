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
 * **Contrast is measured here, not by `contrast-usage.spec.ts`.** An earlier
 * draft of this comment said the sweep covered the panel "for free once it is
 * on screen". It does not: that sweep never clicks anything, so the panel is
 * never rendered while it runs, and it falls squarely into the gap that file
 * already documents — "anything behind a viewport or interaction this fixture
 * does not reach". A surface that only exists after a click has to be measured
 * by whoever does the clicking.
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

test("the panel is legible in both themes", async ({ page }) => {
  // The contrast sweep cannot reach this surface (see the header), so it is
  // measured here against whatever is actually painted behind it. Neutral
  // tokens were chosen for exactly this reason: no background of its own, so it
  // inherits the card and lands on `--muted-foreground` over `--card`.
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/goals");
    const card = page.locator("article", { hasText: "Laptop" });
    await card.getByRole("button", { name: /what this means/i }).click();

    const ratio = await card.getByText(HINT).evaluate((el) => {
      const paint = (colour: string) => {
        const c = document.createElement("canvas");
        c.width = c.height = 1;
        const x = c.getContext("2d")!;
        x.fillStyle = "#ffffff";
        x.fillRect(0, 0, 1, 1);
        x.fillStyle = colour;
        x.fillRect(0, 0, 1, 1);
        const d = x.getImageData(0, 0, 1, 1).data;
        return [d[0] as number, d[1] as number, d[2] as number] as const;
      };
      const lum = (p: readonly [number, number, number]) => {
        const f = (v: number) => {
          const s = v / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(p[0]) + 0.7152 * f(p[1]) + 0.0722 * f(p[2]);
      };
      let node: Element | null = el;
      let backdrop = "rgb(255,255,255)";
      while (node) {
        const bg = getComputedStyle(node).backgroundColor;
        const parts = bg.match(/[\d.]+/g);
        const alpha = parts && parts.length > 3 ? parseFloat(parts[3]!) : 1;
        if (parts && alpha > 0.9) {
          backdrop = bg;
          break;
        }
        node = node.parentElement;
      }
      const a = lum(paint(getComputedStyle(el).color));
      const b = lum(paint(backdrop));
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });

    // AA for normal-size text. The panel is `text-sm`, which is not large.
    expect(ratio, `${theme} theme panel contrast`).toBeGreaterThanOrEqual(4.5);
  }
});
