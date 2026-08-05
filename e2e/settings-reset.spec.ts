import { test, expect } from "@playwright/test";

// "Reset everything" on /settings (dossier §2/§14, issue #69). The unit specs
// stub the confirm and navigate seams, so this is the only layer that exercises
// the real `window.confirm` and the real location change — a wrong path in
// `defaultNavigate` would keep every unit test green and still strand the user.

/** The reference copy for the reset confirmation (dossier §6, `resetConfirm`). */
const RESET_CONFIRM = "This will erase your profile and all goals. Continue?";

/**
 * Seed a real profile (salary > 0, so `hasProfile` hydrates true) and one saved
 * goal, before any app code runs. Schemas match src/state/profile-store.ts and
 * src/state/goals-store.ts (both versioned envelopes).
 *
 * The seed runs ONCE, guarded by a sentinel: `addInitScript` fires on every
 * navigation, so an unguarded seed would silently restore the profile after a
 * reset had cleared it — and a spec that re-seeds what it just erased can never
 * observe the erasure.
 */
async function seedProfileAndGoal(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    if (window.localStorage.getItem("e2e.seeded")) return;
    window.localStorage.setItem("e2e.seeded", "1");
    window.localStorage.setItem(
      "affordo.profile",
      JSON.stringify({
        schemaVersion: 1,
        profile: {
          currency: "EUR",
          salary: 1300,
          hoursPerWeek: 40,
          hoursPerDay: 8,
          paymentsPerYear: 12,
          expenses: 0,
          threshold: 10,
          savings: 0,
          monthlyContribution: 0,
        },
      }),
    );
    window.localStorage.setItem(
      "affordo.goals",
      JSON.stringify({
        schemaVersion: 1,
        goals: [
          {
            id: "g1",
            name: "MacBook Pro",
            price: 2400,
            note: "",
            createdAt: 1700000000000,
          },
        ],
      }),
    );
  });
}

test("cancelling the reset confirmation erases nothing and stays on settings", async ({
  page,
}) => {
  await seedProfileAndGoal(page);

  // Dismiss the native confirm, and capture its message on the way past.
  let seen = "";
  page.on("dialog", async (dialog) => {
    seen = dialog.message();
    await dialog.dismiss();
  });

  await page.goto("/settings");
  await page.getByRole("button", { name: "Reset everything" }).click();

  expect(seen).toBe(RESET_CONFIRM);
  // No navigation: the settings screen is still the one on screen.
  await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible();

  // The profile survived, so /goals still lets the user in and the goal is there.
  await page.goto("/goals");
  await expect(page.getByText("MacBook Pro")).toBeVisible();
});

test("confirming the reset clears profile and goals and returns to onboarding", async ({
  page,
}) => {
  await seedProfileAndGoal(page);

  let seen = "";
  page.on("dialog", async (dialog) => {
    seen = dialog.message();
    await dialog.accept();
  });

  await page.goto("/settings");
  await page.getByRole("button", { name: "Reset everything" }).click();

  expect(seen).toBe(RESET_CONFIRM);
  // The real location change lands on onboarding, at step 0.
  await page.waitForURL("**/onboarding");
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();

  // The profile is genuinely gone: the /goals guard now ejects to onboarding.
  await page.goto("/goals");
  await page.waitForURL("**/onboarding");

  // And so is the goal — nothing survives a confirmed reset.
  const stored = await page.evaluate(() =>
    window.localStorage.getItem("affordo.goals"),
  );
  expect(stored).not.toContain("MacBook Pro");
});

/**
 * Reset's focus ring and hit target (#99).
 *
 * Tailwind implements `ring` as a box-shadow, and box-shadows follow
 * `border-radius`. Reset once carried `p-0`, so its box was 15px tall and a
 * 10px radius clamped to half the height — the focus ring painted as a full
 * stadium hugging the text rather than the rounded rectangle intended.
 *
 * #137 gave it the reference's ghost geometry (`h-9 px-4 py-2 rounded-md`),
 * which fixes both that and the 112×15 hit target #99 recorded as under WCAG
 * 2.2 §2.5.8's 24×24 floor.
 *
 * This is the assertion #99 asked for and left open: jsdom applies no
 * stylesheet, so no unit test can see any of it, and the rest of this spec
 * asserts only roles, URLs and storage. One `getComputedStyle` call pins the
 * whole class.
 */
test("Reset's focus ring is a rounded rectangle, on a target that clears 24px", async ({
  page,
}) => {
  await seedProfileAndGoal(page);
  await page.goto("/settings");
  const reset = page.getByRole("button", { name: "Reset everything" });
  await expect(reset).toBeVisible();

  const box = await reset.boundingBox();
  const radius = await reset.evaluate(
    (el) => parseFloat(getComputedStyle(el).borderRadius) || 0,
  );

  // The stadium test, stated as the geometry rather than as a magic number: a
  // radius at or above half the height IS a stadium, whatever the values are.
  expect(radius).toBeGreaterThan(0);
  expect(radius).toBeLessThan((box?.height ?? 0) / 2);

  // WCAG 2.2 §2.5.8. The reference's `size="sm"` ghost is h-8/32px, so
  // reproducing the reference and clearing this floor are not in tension here.
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(24);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(24);
});
