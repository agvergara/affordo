import { test, expect } from "@playwright/test";

test("shows the Time Cost after entering income and price", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Monthly net income").fill("1.300,00");
  await page.getByLabel("Price").fill("240,00");

  // €1300/mo at 40h/wk = €7.50/h; €240 = 32 work-hours = 4 work days.
  await expect(page.getByTestId("time-cost")).toContainText("4 work days");
});

test("shows Affordable Now when savings cover the price", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Monthly net income").fill("1.300,00");
  await page.getByLabel("Price").fill("240,00");
  await page.getByLabel("Current savings").fill("500,00");

  await expect(page.getByTestId("verdict")).toContainText("afford this right now");
});

test("shows a Save-Up horizon in months when saving is needed", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Monthly net income").fill("1.300,00");
  await page.getByLabel("Monthly expenses").fill("300,00");
  await page.getByLabel("Price").fill("3.000,00");

  // surplus €1000/mo, €3000 needed → about 3 months
  await expect(page.getByTestId("verdict")).toContainText("about 3 months");
});

test("shows Not Reachable when expenses exceed income", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Monthly net income").fill("1.300,00");
  await page.getByLabel("Monthly expenses").fill("1.500,00");
  await page.getByLabel("Price").fill("240,00");

  await expect(page.getByTestId("verdict")).toContainText("Not reachable");
});

test("a windfall flips a goal to Affordable Now", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Monthly net income").fill("1.300,00");
  await page.getByLabel("Price").fill("240,00");
  await page.getByLabel("Current savings").fill("100,00");
  await expect(page.getByTestId("verdict")).not.toContainText(
    "afford this right now",
  );

  await page.getByLabel("Windfall (one-off, optional)").fill("200,00");
  await expect(page.getByTestId("verdict")).toContainText(
    "afford this right now",
  );
});

test("challenges a significant purchase but stays quiet below the threshold", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByLabel("Monthly net income").fill("1.300,00");

  // €1300/mo net → default threshold 10% = €130. €240 exceeds it.
  await page.getByLabel("Price").fill("240,00");
  await expect(page.getByTestId("challenge")).toContainText(
    "significant purchase",
  );

  // €50 is below the threshold → no challenge.
  await page.getByLabel("Price").fill("50,00");
  await expect(page.getByTestId("challenge")).toHaveCount(0);
});

test("clearing Hours per week leaves it empty, not zero", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Hours per week").fill("");

  await expect(page.getByLabel("Hours per week")).toHaveValue("");
});

test("saves a Goal, survives reload, and reopens it", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Monthly net income").fill("1.300,00");
  await page.getByLabel("Price").fill("240,00");
  await page.getByLabel("Goal name").fill("MacBook");
  await page.getByRole("button", { name: "Save as goal" }).click();

  const goals = page.getByTestId("goals");
  await expect(goals).toContainText("MacBook");
  await expect(goals).toContainText("€240,00");

  // The Goal survives a full reload (persisted under the versioned schema).
  await page.reload();
  await expect(page.getByTestId("goals")).toContainText("MacBook");

  // Reopening it repopulates the Price field.
  await page.getByLabel("Price").fill("");
  await page.getByRole("button", { name: "Reopen" }).click();
  await expect(page.getByLabel("Price")).toHaveValue("240,00");
});

test("flags an unparseable price, then recovers when corrected", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Monthly net income").fill("1.300,00");

  await page.getByLabel("Price").fill("1,2,3");
  await expect(page.getByTestId("price-error")).toBeVisible();
  await expect(page.getByTestId("verdict")).toHaveCount(0);

  await page.getByLabel("Price").fill("240,00");
  await expect(page.getByTestId("price-error")).toHaveCount(0);
  await expect(page.getByTestId("verdict")).toBeVisible();
});

test("recomputes the Time Cost from a personal hours-per-day", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Monthly net income").fill("1.300,00");
  await page.getByLabel("Price").fill("240,00");

  // €240 = 32 work-hours: 4 work days at 8h/day, 8 work days at 4h/day.
  await expect(page.getByTestId("time-cost")).toContainText("4 work days");
  await page.getByLabel("Hours per day").fill("4");
  await expect(page.getByTestId("time-cost")).toContainText("8 work days");
});

test("itemizes expenses into a monthly total", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Add expense item" }).click();
  await page.getByLabel("Expense amount").fill("100,00");
  await page.getByLabel("Expense frequency").selectOption("weekly");

  // €100/week → €433,33/mo
  await expect(page.getByTestId("monthly-expenses-total")).toContainText(
    "€433,33",
  );
});
