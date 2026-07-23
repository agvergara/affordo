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
