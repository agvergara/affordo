import { test, expect } from "@playwright/test";

// Adding, editing and removing a goal from the dashboard, each surviving a
// reload (dossier §5/§8, issues #64 and #65).

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

/** Add `count` goals, newest last, so the list ends up newest-first. */
async function addGoals(
  page: import("@playwright/test").Page,
  goals: [name: string, price: string][],
) {
  for (const [name, price] of goals) {
    await page.getByRole("button", { name: "Add goal" }).click();
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Price").fill(price);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  }
}

test("a goal edited from its card is updated in place and survives a reload", async ({
  page,
}) => {
  await seedProfile(page);
  // Seeded with a creation date in 2020, not created through the UI.
  //
  // The card renders `toLocaleDateString`, i.e. day granularity, so a goal
  // created seconds before it is edited produces the same string whether or not
  // `createdAt` is preserved — this assertion used to pass against a save path
  // re-stamping `createdAt: Date.now()` on every write (#105). A date the run
  // cannot possibly have produced is what makes it mean something.
  await page.addInitScript(() => {
    // Only on first load. `addInitScript` runs on every navigation, so an
    // unguarded seed would re-write the original goal during the reload below
    // and quietly undo the edit this test exists to verify.
    if (window.localStorage.getItem("affordo.goals")) return;
    window.localStorage.setItem(
      "affordo.goals",
      JSON.stringify({
        schemaVersion: 1,
        goals: [
          {
            id: "seeded-1",
            name: "Down payment",
            price: 20000,
            note: "",
            createdAt: Date.UTC(2020, 0, 15, 12),
          },
        ],
      }),
    );
  });
  await page.goto("/goals");

  const item = page.getByTestId("goals-list").getByRole("listitem").first();
  const stamped = await item.locator("p").first().textContent();
  // Guard the guard: if the seed ever stops landing, `stamped` would be
  // today's date and the assertion below would go hollow again.
  expect(stamped).toContain("2020");

  await item.getByRole("button", { name: "Edit" }).click();

  // The dialog opens as the edit dialog, already carrying the goal's values.
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Edit goal" }),
  ).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveValue("Down payment");
  await expect(page.getByLabel("Price")).toHaveValue("20000");

  await page.getByLabel("Name").fill("House deposit");
  await page.getByLabel("Price").fill("25000");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();

  // Updated in place: renamed, repriced, and still exactly one goal — an edit
  // that duplicated or re-stamped the goal would read "Saved goals · 2".
  await expect(page.getByText("Saved goals · 1")).toBeVisible();
  await expect(page.getByText("House deposit")).toBeVisible();
  await expect(page.getByText("Down payment")).toBeHidden();
  await expect(page.getByTestId("goals-list")).toContainText("25.000,00 €");
  // The creation date is the goal's, not the moment it was edited — and now
  // that the seed is from 2020, re-stamping it would read as today.
  await expect(page.getByTestId("goals-list").locator("p").first()).toHaveText(
    stamped ?? "",
  );

  await page.reload();
  await expect(page.getByText("House deposit")).toBeVisible();
  await expect(page.getByText("Saved goals · 1")).toBeVisible();
});

test("a goal removed from its card is deleted and stays deleted after a reload", async ({
  page,
}) => {
  await seedProfile(page);
  await page.goto("/goals");
  await addGoals(page, [
    ["Down payment", "20000"],
    ["MacBook Pro", "1500"],
  ]);
  await expect(page.getByText("Saved goals · 2")).toBeVisible();

  // Remove the newest, which sits on top — the other must be untouched.
  const items = page.getByTestId("goals-list").getByRole("listitem");
  await items.first().getByRole("button", { name: "Remove" }).click();

  await expect(page.getByText("Saved goals · 1")).toBeVisible();
  await expect(page.getByText("MacBook Pro")).toBeHidden();
  await expect(page.getByText("Down payment")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Saved goals · 1")).toBeVisible();
  await expect(page.getByText("MacBook Pro")).toBeHidden();
  await expect(page.getByText("Down payment")).toBeVisible();
});

test("removing the last goal returns the dashboard to its empty state", async ({
  page,
}) => {
  await seedProfile(page);
  await page.goto("/goals");
  await addGoals(page, [["Down payment", "20000"]]);

  await page
    .getByTestId("goals-list")
    .getByRole("listitem")
    .first()
    .getByRole("button", { name: "Remove" })
    .click();

  await expect(page.getByText("Saved goals · 0")).toBeVisible();
  await expect(page.getByTestId("goals-empty")).toBeVisible();
  await expect(
    page.getByText("No decisions to reckon with yet."),
  ).toBeVisible();
});
