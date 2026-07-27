import { test, expect } from "@playwright/test";

// The redirect gate at / and the per-route guards (dossier §2/§14, issue #48).
// This replaces the old calculator-at-/ e2e (timecost.spec.ts): since #48, / is
// a pure redirect gate and the calculator no longer lives at a route. These
// specs assert the navigation a cold visitor and a profile-holder each see.

test("/ redirects a profile-less visitor to /onboarding", async ({ page }) => {
  await page.goto("/");

  // The gate leaves / for /onboarding when there is no profile.
  await page.waitForURL("**/onboarding");
  // The wizard chrome opens on step 0 (Welcome heading, dossier §5/§16).
  await expect(
    page.getByRole("heading", { name: "Welcome" }),
  ).toBeVisible();
});

test("/goals redirects to /onboarding when there is no profile", async ({
  page,
}) => {
  await page.goto("/goals");

  await page.waitForURL("**/onboarding");
  // The wizard chrome opens on step 0 (Welcome heading, dossier §5/§16).
  await expect(
    page.getByRole("heading", { name: "Welcome" }),
  ).toBeVisible();
});

test("/settings redirects to /onboarding when there is no profile", async ({
  page,
}) => {
  await page.goto("/settings");

  await page.waitForURL("**/onboarding");
  // The wizard chrome opens on step 0 (Welcome heading, dossier §5/§16).
  await expect(
    page.getByRole("heading", { name: "Welcome" }),
  ).toBeVisible();
});

test("with a stored profile, / redirects to /goals and /goals renders", async ({
  page,
}) => {
  // Seed a real profile (salary > 0) before any app code runs, so hasProfile
  // hydrates true. Schema matches src/state/profile-store.ts (versioned).
  await page.addInitScript(() => {
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
  });

  await page.goto("/");
  await page.waitForURL("**/goals");
  await expect(page.getByRole("heading", { name: /goals/i })).toBeVisible();

  // The guard lets a profile-holder into /goals directly, too — no redirect.
  await page.goto("/goals");
  await expect(page.getByRole("heading", { name: /goals/i })).toBeVisible();
});
