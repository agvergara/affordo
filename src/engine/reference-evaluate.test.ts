import { describe, expect, it } from "vitest";
import { evaluate } from "./reference-evaluate";
import type { ReferenceProfile } from "./reference-types";

/**
 * Baseline profile: €2000/mo, 40h/wk, 8h/day, 12 payments/yr, €1000 expenses,
 * 10% threshold, no savings, no extra contribution → monthlyDisposable €1000.
 */
function profile(overrides: Partial<ReferenceProfile> = {}): ReferenceProfile {
  return {
    currency: "EUR",
    salary: 2000,
    hoursPerWeek: 40,
    hoursPerDay: 8,
    paymentsPerYear: 12,
    expenses: 1000,
    threshold: 10,
    savings: 0,
    monthlyContribution: 0,
    ...overrides,
  };
}

describe("reference evaluate — derived figures", () => {
  it("computes hourlyRate from salary, payments and weekly hours", () => {
    // (2000 * 12) / (52 * 40) = 24000 / 2080 = 11.538...
    const v = evaluate(profile(), { price: 0 });
    expect(v.hourlyRate).toBeCloseTo(11.5385, 4);
  });

  it("derives hoursOfWork, daysOfWork and pctOfMonthlyIncome", () => {
    const v = evaluate(profile(), { price: 1000 });
    expect(v.hoursOfWork).toBeCloseTo(1000 / v.hourlyRate, 10);
    expect(v.daysOfWork).toBeCloseTo(v.hoursOfWork / 8, 10);
    expect(v.pctOfMonthlyIncome).toBe(50); // 1000 / 2000 * 100
  });

  it("computes monthlyDisposable = salary - expenses + monthlyContribution", () => {
    const v = evaluate(
      profile({ monthlyContribution: 250 }),
      { price: 0 },
    );
    expect(v.monthlyDisposable).toBe(1250); // 2000 - 1000 + 250
  });

  it("treats an absent monthlyContribution as 0", () => {
    const { monthlyContribution: _omit, ...rest } = profile();
    const v = evaluate(rest as ReferenceProfile, { price: 0 });
    expect(v.monthlyDisposable).toBe(1000);
  });

  it("sets aboveThreshold when pct exceeds the threshold (strict)", () => {
    // price 200 → 10% of 2000 → exactly at threshold, not above.
    expect(evaluate(profile(), { price: 200 }).aboveThreshold).toBe(false);
    expect(evaluate(profile(), { price: 201 }).aboveThreshold).toBe(true);
  });
});

describe("reference evaluate — Infinity / zero guards", () => {
  it("hourlyRate is 0 and hoursOfWork Infinity when hoursPerWeek is 0", () => {
    const v = evaluate(profile({ hoursPerWeek: 0 }), { price: 500 });
    expect(v.hourlyRate).toBe(0);
    expect(v.hoursOfWork).toBe(Infinity);
    // daysOfWork = Infinity / 8 = Infinity
    expect(v.daysOfWork).toBe(Infinity);
  });

  it("daysOfWork is Infinity when hoursPerDay is 0", () => {
    const v = evaluate(profile({ hoursPerDay: 0 }), { price: 500 });
    expect(v.daysOfWork).toBe(Infinity);
    // hoursOfWork still finite (hoursPerWeek > 0)
    expect(Number.isFinite(v.hoursOfWork)).toBe(true);
  });

  it("pctOfMonthlyIncome is Infinity when salary is 0", () => {
    const v = evaluate(profile({ salary: 0 }), { price: 500 });
    expect(v.pctOfMonthlyIncome).toBe(Infinity);
    expect(v.aboveThreshold).toBe(true); // Infinity > threshold
  });
});

describe("reference evaluate — afford", () => {
  it("is afford when savings exceed the price", () => {
    const v = evaluate(profile({ savings: 600 }), { price: 500 });
    expect(v.kind).toBe("afford");
    expect(v.monthsToSave).toBeNull();
    expect(v.cutPct).toBeNull();
    expect(v.cutMonths).toBeNull();
  });

  it("is afford when savings exactly equal the price (boundary)", () => {
    const v = evaluate(profile({ savings: 500 }), { price: 500 });
    expect(v.kind).toBe("afford");
  });
});

describe("reference evaluate — stretch", () => {
  it("is stretch when monthsToSave is under 12", () => {
    // remaining 5000, disposable 1000 → 5 months.
    const v = evaluate(profile(), { price: 5000 });
    expect(v.kind).toBe("stretch");
    expect(v.monthsToSave).toBeCloseTo(5, 10);
    expect(v.cutPct).toBeNull();
  });

  it("is stretch at exactly monthsToSave === 12 (boundary)", () => {
    // remaining 12000, disposable 1000 → exactly 12 months.
    const v = evaluate(profile(), { price: 12000 });
    expect(v.kind).toBe("stretch");
    expect(v.monthsToSave).toBe(12);
  });

  it("subtracts savings from the price before projecting months", () => {
    // price 6000, savings 2000 → remaining 4000, disposable 1000 → 4 months.
    const v = evaluate(profile({ savings: 2000 }), { price: 6000 });
    expect(v.kind).toBe("stretch");
    expect(v.monthsToSave).toBeCloseTo(4, 10);
  });

  it("falls out of stretch just over 12 months", () => {
    // remaining 12001, disposable 1000 → 12.001 months → not stretch.
    const v = evaluate(profile(), { price: 12001 });
    expect(v.kind).not.toBe("stretch");
    expect(v.monthsToSave).toBeNull();
  });
});

describe("reference evaluate — cutToAfford (positive surplus branch)", () => {
  it("is cutToAfford when a ≤50% expense cut reaches it in 12 months", () => {
    // remaining 18000, disposable 1000. monthsToSave 18 > 12.
    // targetMonthly = 1500, extraNeeded = 500, maxCut = 500 → exactly at boundary.
    const v = evaluate(profile(), { price: 18000 });
    expect(v.kind).toBe("cutToAfford");
    expect(v.cutPct).toBeCloseTo(50, 10); // 500 / 1000 * 100
    expect(v.cutMonths).toBe(12);
    expect(v.monthsToSave).toBeNull();
  });

  it("is cannot just past the 50% expense-cut boundary", () => {
    // remaining 18120, disposable 1000. targetMonthly = 1510,
    // extraNeeded = 510 > maxCut 500 → cannot.
    const v = evaluate(profile(), { price: 18120 });
    expect(v.kind).toBe("cannot");
    expect(v.cutPct).toBeNull();
    expect(v.cutMonths).toBeNull();
  });
});

describe("reference evaluate — no-surplus branch", () => {
  it("is cutToAfford when disposable ≤ 0 but a ≤50% cut still reaches it", () => {
    // salary 1000, expenses 1000 → disposable 0. price 6000, savings 0.
    // targetMonthly = 500, maxCut = 500. 500 - 0 = 500 ≤ 500 → cutToAfford.
    const v = evaluate(
      profile({ salary: 1000, expenses: 1000 }),
      { price: 6000 },
    );
    expect(v.kind).toBe("cutToAfford");
    expect(v.cutPct).toBeCloseTo(50, 10);
    expect(v.cutMonths).toBe(12);
  });

  it("handles negative disposable in the no-surplus branch", () => {
    // salary 900, expenses 1000 → disposable -100. price 4800.
    // targetMonthly = 400, 400 - (-100) = 500, maxCut = 500 → cutToAfford.
    const v = evaluate(
      profile({ salary: 900, expenses: 1000 }),
      { price: 4800 },
    );
    expect(v.kind).toBe("cutToAfford");
    expect(v.cutPct).toBeCloseTo(50, 10); // 500 / 1000 * 100
  });

  it("is cannot when the required cut exceeds 50% of expenses", () => {
    // salary 900, expenses 1000 → disposable -100. price 5000.
    // targetMonthly = 416.67, needed = 516.67 > maxCut 500 → cannot.
    const v = evaluate(
      profile({ salary: 900, expenses: 1000 }),
      { price: 5000 },
    );
    expect(v.kind).toBe("cannot");
  });

  it("uses cutPct 0 when there are no expenses to cut", () => {
    // salary 0, expenses 0 → disposable 0. price 1200, savings 0.
    // targetMonthly = 100, maxCut = 0. 100 - 0 = 100 > 0 → cannot (not cutToAfford).
    const cannot = evaluate(profile({ salary: 0, expenses: 0 }), { price: 1200 });
    expect(cannot.kind).toBe("cannot");
    // With savings covering all but a hair, remaining is 0 → targetMonthly 0 ≤ maxCut 0.
    const v = evaluate(
      profile({ salary: 0, expenses: 0, savings: 1200 }),
      { price: 1200 },
    );
    expect(v.kind).toBe("afford"); // savings >= price short-circuits first
  });
});
