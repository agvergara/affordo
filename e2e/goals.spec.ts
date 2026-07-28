import { test, expect } from "@playwright/test";

// Adding a goal from the dashboard and having it survive a reload (dossier
// §5/§8, issue #64). Editing and removing a goal land with issue #65.

/** Seed a real profile (salary > 0) before app code runs, so the /goals guard
 *  lets us in. Schema matches src/state/profile-store.ts (versioned). */
async function seedProfile(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "affordo.profile",
      JSON.stringify({
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
      }),
    );
  });
}

test("a goal added from the dashboard survives a reload", async ({ page }) => {
  await seedProfile(page);
  await page.goto("/goals");

  await expect(page.getByText("Saved goals · 0")).toBeVisible();

  await page.getByRole("button", { name: "Add goal" }).click();

  // Save stays disabled until there is a name and a positive price.
  const save = page.getByRole("button", { name: "Save" });
  await expect(save).toBeDisabled();
  await page.getByLabel("Name").fill("MacBook Pro");
  await expect(save).toBeDisabled();
  await page.getByLabel("Price").fill("1500");
  await expect(save).toBeEnabled();

  await save.click();

  // The dialog closes and the goal joins the list.
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Saved goals · 1")).toBeVisible();
  await expect(page.getByText("MacBook Pro")).toBeVisible();

  // It was persisted, not just held in memory.
  await page.reload();
  await expect(page.getByText("MacBook Pro")).toBeVisible();
  await expect(page.getByText("Saved goals · 1")).toBeVisible();
});

test("the newest goal is prepended to the list", async ({ page }) => {
  await seedProfile(page);
  await page.goto("/goals");

  for (const [name, price] of [
    ["Down payment", "20000"],
    ["MacBook Pro", "1500"],
  ]) {
    await page.getByRole("button", { name: "Add goal" }).click();
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Price").fill(price);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  }

  // MacBook Pro was added last, so it sits on top.
  const names = page.getByTestId("goals-list").getByRole("listitem");
  await expect(names.first()).toContainText("MacBook Pro");
  await expect(names.last()).toContainText("Down payment");
});
