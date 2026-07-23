import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate";
import type { Profile, Purchase, Settings } from "./types";

const settings: Settings = { currency: "EUR" };

/** A profile whose Net Hourly Wage works out to exactly €10.00/hour (net €1300/mo). */
function profileAt10PerHour(
  savings: number = 0,
  monthlyExpenses: number = 0,
): Profile {
  // monthlyHours = 30 * 52/12 = 130; monthlyNet €1300.00 / 130h = €10.00/h
  return {
    income: { monthlyNet: 130_000, hoursPerWeek: 30, paymentsPerYear: 12 },
    hoursPerDay: 8,
    savings,
    monthlyExpenses,
  };
}

describe("evaluate — Time Cost", () => {
  it("costs one work-hour for a purchase priced at exactly one hour of pay", () => {
    const purchase: Purchase = { price: 1_000 }; // €10.00, one hour at €10/h
    const result = evaluate(profileAt10PerHour(), purchase, settings);
    expect(result.timeCost.hours).toBe(1);
  });

  it("derives Net Hourly Wage from monthly net pay and weekly hours", () => {
    // €2000.00/mo at 40h/wk → 173.33 monthly hours → €11.54/h
    const profile: Profile = {
      income: { monthlyNet: 200_000, hoursPerWeek: 40, paymentsPerYear: 12 },
      hoursPerDay: 8,
      savings: 0,
      monthlyExpenses: 0,
    };
    const result = evaluate(profile, { price: 0 }, settings);
    expect(result.netHourlyWage).toBe(1_154);
  });

  it("normalizes 14 payments/year into a higher effective income, lowering Time Cost", () => {
    const income = { monthlyNet: 200_000, hoursPerWeek: 40 };
    const purchase: Purchase = { price: 100_000 };
    const twelve = evaluate(
      { income: { ...income, paymentsPerYear: 12 }, hoursPerDay: 8, savings: 0, monthlyExpenses: 0 },
      purchase,
      settings,
    );
    const fourteen = evaluate(
      { income: { ...income, paymentsPerYear: 14 }, hoursPerDay: 8, savings: 0, monthlyExpenses: 0 },
      purchase,
      settings,
    );
    expect(fourteen.timeCost.hours).toBeLessThan(twelve.timeCost.hours);
    // 14 payments is 14/12 more annual pay, so Time Cost scales by 12/14
    expect(fourteen.timeCost.hours).toBeCloseTo(
      (twelve.timeCost.hours * 12) / 14,
      6,
    );
  });

  it("expresses a multi-day cost in work days built from the user's hours/day", () => {
    // €10/h, 8h/day, 30h/wk. €240 = 24h = 3 work days (< one 30h work week).
    const result = evaluate(profileAt10PerHour(), { price: 24_000 }, settings);
    expect(result.timeCost.display).toEqual({ value: 3, unit: "work-days" });
  });

  it("escalates to work weeks for a cost beyond a week", () => {
    // €10/h, 30h/wk. €600 = 60h = 2 work weeks (>= 30h week, < 130h month).
    const result = evaluate(profileAt10PerHour(), { price: 60_000 }, settings);
    expect(result.timeCost.display).toEqual({ value: 2, unit: "work-weeks" });
  });

  it("escalates to work months for a large cost, so a house isn't thousands of hours", () => {
    // €10/h, monthlyHours = 130. €2600 = 260h = 2 work months.
    const result = evaluate(profileAt10PerHour(), { price: 260_000 }, settings);
    expect(result.timeCost.display).toEqual({ value: 2, unit: "work-months" });
  });

  it("rounds the displayed hours figure to one decimal (ADR 0012)", () => {
    // €10/h → €23.40 = 2.34h, rounded to 2.3h; raw hours stays exact.
    const result = evaluate(profileAt10PerHour(), { price: 2_340 }, settings);
    expect(result.timeCost.hours).toBeCloseTo(2.34, 6);
    expect(result.timeCost.display).toEqual({ value: 2.3, unit: "hours" });
  });

  it("rounds larger Work-Time Units to the nearest half (ADR 0012)", () => {
    // €2000/mo, 40h/wk, 8h/day. €500 = 43.33h = 1.083 work weeks → 1.0.
    const profile: Profile = {
      income: { monthlyNet: 200_000, hoursPerWeek: 40, paymentsPerYear: 12 },
      hoursPerDay: 8,
      savings: 0,
      monthlyExpenses: 0,
    };
    const result = evaluate(profile, { price: 50_000 }, settings);
    expect(result.timeCost.display).toEqual({ value: 1, unit: "work-weeks" });
  });
});

describe("evaluate — Affordability Verdict", () => {
  it("is Affordable Now when savings cover the price", () => {
    const result = evaluate(profileAt10PerHour(50_000), { price: 40_000 }, settings);
    expect(result.verdict.kind).toBe("affordable-now");
  });

  it("is Affordable Now when savings exactly equal the price", () => {
    const result = evaluate(profileAt10PerHour(40_000), { price: 40_000 }, settings);
    expect(result.verdict.kind).toBe("affordable-now");
  });

  it("projects a Save-Up Date in whole months when Surplus is positive", () => {
    // net €1300, expenses €300 → surplus €1000/mo. Price €3000, savings €0 → 3 months.
    const result = evaluate(
      profileAt10PerHour(0, 30_000),
      { price: 300_000 },
      settings,
    );
    expect(result.verdict).toEqual({ kind: "save-up", months: 3 });
  });

  it("rounds the number of months up (never earlier than affordable)", () => {
    // surplus €1000/mo, price €2500, savings €0 → 2.5 months → 3.
    const result = evaluate(
      profileAt10PerHour(0, 30_000),
      { price: 250_000 },
      settings,
    );
    expect(result.verdict).toEqual({ kind: "save-up", months: 3 });
  });

  it("is Not Reachable with a monthly shortfall when Surplus is negative", () => {
    // net €1300, expenses €1500 → surplus −€200/mo.
    const result = evaluate(
      profileAt10PerHour(0, 150_000),
      { price: 40_000 },
      settings,
    );
    expect(result.verdict).toEqual({
      kind: "not-reachable",
      monthlyShortfall: 20_000,
    });
  });

  it("keeps monthlyShortfall a whole number of cents when pay periods make net fractional", () => {
    // paymentsPerYear 14 → normalized net €1516.6667; expenses €1520 → shortfall €3.33
    const profile: Profile = {
      income: { monthlyNet: 130_000, hoursPerWeek: 30, paymentsPerYear: 14 },
      hoursPerDay: 8,
      savings: 0,
      monthlyExpenses: 152_000,
    };
    const result = evaluate(profile, { price: 40_000 }, settings);
    expect(result.verdict.kind).toBe("not-reachable");
    if (result.verdict.kind === "not-reachable") {
      expect(Number.isInteger(result.verdict.monthlyShortfall)).toBe(true);
      expect(result.verdict.monthlyShortfall).toBe(333);
    }
  });

  it("is Not Reachable when Surplus is exactly zero (no divide-by-zero)", () => {
    // net €1300, expenses €1300 → surplus 0.
    const result = evaluate(
      profileAt10PerHour(0, 130_000),
      { price: 40_000 },
      settings,
    );
    expect(result.verdict).toEqual({ kind: "not-reachable", monthlyShortfall: 0 });
  });

  it("gives an honest long but finite horizon for a tiny Surplus", () => {
    // net €1300, expenses €1299.99 → surplus 1 cent/mo. Price €400 → 40,000 months, finite.
    const result = evaluate(
      profileAt10PerHour(0, 129_999),
      { price: 40_000 },
      settings,
    );
    expect(result.verdict.kind).toBe("save-up");
    if (result.verdict.kind === "save-up") {
      expect(Number.isFinite(result.verdict.months)).toBe(true);
      expect(result.verdict.months).toBe(40_000);
    }
  });
});
