import { expect, test } from "@playwright/test";

/**
 * WCAG 2.2 §2.5.8: interactive targets are at least 24x24 CSS pixels
 * (ADR 0022).
 *
 * This exists because the project applied the rule inconsistently before it had
 * one: the duel on #95 treated a 16x16 toggle as a finding and fixed it, and
 * the duel on #97 declined the same finding on a 112x15 button. That was not a
 * disagreement about facts — it was the absence of a policy, resolved
 * differently by whoever happened to be reviewing (#99, #145).
 *
 * A sweep rather than per-element assertions, because the failures it found
 * were in three different components and nobody had thought to check any of
 * them: the header's two links (54x17 and 56x15) and the dialog's close button
 * (12x24). Per-element tests only ever cover what someone already suspected.
 *
 * jsdom applies no stylesheet, so this cannot live in the unit suite.
 */

const PROFILE = {
  schemaVersion: 1,
  profile: {
    currency: "EUR", salary: 2000, hoursPerWeek: 40, hoursPerDay: 8,
    paymentsPerYear: 12, expenses: 500, threshold: 10, savings: 0,
    monthlyContribution: 0,
  },
};
const GOALS = {
  schemaVersion: 1,
  goals: [{ id: "g1", name: "MacBook", price: 2500, note: "n", createdAt: 1 }],
};

/** Everything a pointer or keyboard can activate. */
const INTERACTIVE =
  'button, a[href], input:not([type=hidden]), select, textarea, [role=button], [tabindex]:not([tabindex="-1"])';

async function undersizedOn(
  page: import("@playwright/test").Page,
): Promise<string[]> {
  return page.evaluate((selector) => {
    return Array.from(document.querySelectorAll(selector))
      .map((el) => {
        const r = el.getBoundingClientRect();
        const name = (
          el.getAttribute("aria-label") ||
          el.textContent ||
          (el as HTMLInputElement).id ||
          el.tagName
        )
          .trim()
          .slice(0, 30);
        return { name, tag: el.tagName, w: r.width, h: r.height };
      })
      // A zero-size element is hidden, not undersized.
      .filter((t) => t.w > 0 && t.h > 0)
      .filter((t) => t.w < 24 || t.h < 24)
      .map((t) => `${t.tag} "${t.name}" ${Math.round(t.w)}x${Math.round(t.h)}`);
  }, INTERACTIVE);
}

test("every interactive target clears 24x24", async ({ page }) => {
  await page.addInitScript((d) => {
    window.localStorage.setItem("affordo.profile", JSON.stringify(d.p));
    window.localStorage.setItem("affordo.goals", JSON.stringify(d.g));
  }, { p: PROFILE, g: GOALS });

  for (const route of ["/goals", "/settings", "/onboarding", "/no-such-page"]) {
    await page.goto(route);
    await expect(page.locator("body")).toBeVisible();
    expect(await undersizedOn(page), `undersized targets on ${route}`).toEqual(
      [],
    );
  }

  // The dialog is not reachable by URL, and it holds the control that was
  // worst before this rule (the 12x24 close button).
  await page.goto("/goals");
  await page.getByRole("button", { name: /add goal/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await undersizedOn(page), "undersized targets in the dialog").toEqual(
    [],
  );
});

test("the sweep sees the controls it claims to, so it cannot pass vacuously", async ({
  page,
}) => {
  // Without this, a selector that matched nothing would make every assertion
  // above trivially true — the failure mode the retirement guard in
  // contrast.test.ts was rewritten to avoid.
  await page.addInitScript((d) => {
    window.localStorage.setItem("affordo.profile", JSON.stringify(d.p));
    window.localStorage.setItem("affordo.goals", JSON.stringify(d.g));
  }, { p: PROFILE, g: GOALS });
  await page.goto("/settings");
  const count = await page.evaluate(
    (s) => document.querySelectorAll(s).length,
    INTERACTIVE,
  );
  // Settings alone has 9 fields plus Save, Reset, the brand and theme controls.
  expect(count).toBeGreaterThan(12);
});
