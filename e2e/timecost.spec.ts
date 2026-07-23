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
