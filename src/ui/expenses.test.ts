import { describe, expect, it } from "vitest";
import { frequencyToMonthly, monthlyExpensesTotal } from "./expenses";

describe("frequencyToMonthly", () => {
  it("passes a monthly amount through unchanged", () => {
    expect(frequencyToMonthly(1_000, "monthly")).toBe(1_000);
  });

  it("spreads a weekly amount across the average month (×52/12)", () => {
    // €10/week → €43.33/mo
    expect(frequencyToMonthly(1_000, "weekly")).toBe(4_333);
  });

  it("splits quarterly and annual amounts", () => {
    expect(frequencyToMonthly(3_000, "quarterly")).toBe(1_000);
    expect(frequencyToMonthly(12_000, "annual")).toBe(1_000);
  });
});

describe("monthlyExpensesTotal", () => {
  it("sums line items normalized to a monthly figure", () => {
    // €10/week (€43.33) + €50/mo = €93.33
    const total = monthlyExpensesTotal([
      { label: "Coffee", amount: 1_000, frequency: "weekly" },
      { label: "Gym", amount: 5_000, frequency: "monthly" },
    ]);
    expect(total).toBe(9_333);
  });
});
