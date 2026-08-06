import { describe, expect, it } from "vitest";
import { compare, type ComparableGoal } from "./comparison";
import type { ReferenceProfile } from "./reference-types";

/**
 * The Comparison seam (#155, ADR 0024). Table-driven against `compare()`, the
 * way `reference-evaluate.test.ts` is against the verdict engine — this is
 * where wrong-money advice would originate, so coverage is heaviest here.
 *
 * Every expectation is on the returned Comparison, never on how it was reached.
 */

/** salary 3000 − expenses 500 + contribution 0 = 2500 disposable. */
const profile: ReferenceProfile = {
  currency: "EUR",
  salary: 3000,
  hoursPerWeek: 40,
  hoursPerDay: 8,
  paymentsPerYear: 12,
  expenses: 500,
  threshold: 10,
  savings: 0,
  monthlyContribution: 0,
};

const goal = (id: string, price: number, share?: number): ComparableGoal =>
  share === undefined ? { id, price } : { id, price, share };

describe("the Monthly Disposable it divides", () => {
  it("is salary minus expenses plus contribution", () => {
    expect(compare(profile, []).monthlyDisposable).toBe(2500);
  });

  it("folds in a contribution when the profile carries one", () => {
    const withExtra = { ...profile, monthlyContribution: 250 };
    expect(compare(withExtra, []).monthlyDisposable).toBe(2750);
  });

  it("treats an absent contribution as zero", () => {
    const { monthlyContribution: _omitted, ...withoutExtra } = profile;
    expect(compare(withoutExtra, []).monthlyDisposable).toBe(2500);
  });

  it("reports a negative disposable rather than clamping it", () => {
    // Honest input for a real profile: expenses exceeding income. Clamping to
    // zero here would hide the state the no-surplus slice has to react to.
    const overspent = { ...profile, salary: 1000, expenses: 1500 };
    expect(compare(overspent, []).monthlyDisposable).toBe(-500);
  });
});

describe("Unassigned goals", () => {
  it("has one row per goal, in the order given, even with nothing assigned", () => {
    const result = compare(profile, [
      goal("a", 100),
      goal("b", 200),
      goal("c", 300),
    ]);
    expect(result.rows.map((r) => r.goalId)).toEqual(["a", "b", "c"]);
  });

  it("assigns nothing and totals nothing when no goal carries a Share", () => {
    const result = compare(profile, [goal("a", 100), goal("b", 200)]);
    expect(result.assigned).toBe(0);
    expect(result.rows.every((r) => r.share === null)).toBe(true);
  });

  it("gives an Unassigned goal no months — it is outside the plan, not slow", () => {
    const [row] = compare(profile, [goal("a", 1000)]).rows;
    expect(row?.months).toBeNull();
  });

  it("gives an Unassigned goal none of the savings", () => {
    const saved = { ...profile, savings: 9000 };
    const [row] = compare(saved, [goal("a", 1000)]).rows;
    expect(row?.openingBalance).toBe(0);
  });

  // The three ways a goal can be Unassigned all mean the same thing, so they
  // must produce the same row. Zero is the one a user actually creates.
  it.each([
    ["absent", undefined],
    ["zero", 0],
    ["negative", -50],
  ])("reads a %s Share as Unassigned", (_label, share) => {
    const [row] = compare(profile, [goal("a", 1000, share)]).rows;
    expect(row?.share).toBeNull();
    expect(row?.months).toBeNull();
    expect(row?.openingBalance).toBe(0);
  });

  it("reads a non-finite Share as Unassigned rather than trusting the store", () => {
    // localStorage is user-writable, so the engine is reachable without the
    // store's range validation (ADR 0019) ever having run.
    const [row] = compare(profile, [goal("a", 1000, Number.NaN)]).rows;
    expect(row?.share).toBeNull();
    expect(row?.months).toBeNull();
  });

  it("does not let an Unassigned goal dilute an assigned one's savings", () => {
    const saved = { ...profile, savings: 1000 };
    const result = compare(saved, [goal("a", 5000, 100), goal("b", 5000)]);
    // "a" is the only Share, so it takes the whole pot, not half of it.
    expect(result.rows[0]?.openingBalance).toBe(1000);
    expect(result.rows[1]?.openingBalance).toBe(0);
  });
});

describe("months at a Share", () => {
  it("divides what is left by the Share", () => {
    const [row] = compare(profile, [goal("a", 1200, 100)]).rows;
    expect(row?.months).toBe(12);
  });

  it("takes longer at a smaller Share, which is the whole point", () => {
    const result = compare(profile, [
      goal("a", 1200, 100),
      goal("b", 1200, 400),
    ]);
    expect(result.rows[0]?.months).toBe(12);
    expect(result.rows[1]?.months).toBe(3);
  });

  it("keeps months fractional rather than rounding up", () => {
    // ADR 0012's round-up was superseded by ADR 0017; the verdict engine does
    // no rounding in its math either, and rounding here would disagree with it.
    const [row] = compare(profile, [goal("a", 100, 30)]).rows;
    expect(row?.months).toBeCloseTo(3.3333, 4);
  });

  it("funds a goal at month zero when its opening balance covers the price", () => {
    const saved = { ...profile, savings: 5000 };
    const [row] = compare(saved, [goal("a", 800, 100)]).rows;
    expect(row?.months).toBe(0);
  });

  it("funds a free goal at month zero rather than dividing by its price", () => {
    const [row] = compare(profile, [goal("a", 0, 100)]).rows;
    expect(row?.months).toBe(0);
  });

  it("counts only the shortfall once savings are applied", () => {
    const saved = { ...profile, savings: 1000 };
    const [row] = compare(saved, [goal("a", 1500, 100)]).rows;
    expect(row?.months).toBe(5);
  });
});

describe("savings follow the Share", () => {
  it("splits the pot in proportion to the assigned monthly", () => {
    const saved = { ...profile, savings: 5000 };
    const result = compare(saved, [goal("a", 9000, 100), goal("b", 9000, 200)]);
    expect(result.rows[0]?.openingBalance).toBeCloseTo(1666.67, 2);
    expect(result.rows[1]?.openingBalance).toBeCloseTo(3333.33, 2);
  });

  it("never hands out more than there is", () => {
    const saved = { ...profile, savings: 5000 };
    const result = compare(saved, [goal("a", 9000, 100), goal("b", 9000, 200)]);
    const handed = result.rows.reduce((t, r) => t + r.openingBalance, 0);
    expect(handed).toBeCloseTo(5000, 6);
  });

  it("gives one Shared goal the whole pot", () => {
    const saved = { ...profile, savings: 5000 };
    const [row] = compare(saved, [goal("a", 9000, 100)]).rows;
    expect(row?.openingBalance).toBe(5000);
  });

  it("treats a negative stored balance as nothing saved", () => {
    const hostile = { ...profile, savings: -5000 };
    const [row] = compare(hostile, [goal("a", 1000, 100)]).rows;
    expect(row?.openingBalance).toBe(0);
    expect(row?.months).toBe(10);
  });
});

describe("Overdrawn", () => {
  it("is false when the Shares fit", () => {
    const result = compare(profile, [
      goal("a", 100, 1000),
      goal("b", 200, 500),
    ]);
    expect(result.assigned).toBe(1500);
    expect(result.overdrawn).toBe(false);
  });

  it("is false when the Shares total exactly the disposable", () => {
    // The boundary is the one worth pinning: exactly spent is a valid plan.
    const result = compare(profile, [
      goal("a", 100, 2000),
      goal("b", 200, 500),
    ]);
    expect(result.assigned).toBe(2500);
    expect(result.overdrawn).toBe(false);
  });

  it("is true when the Shares exceed the disposable", () => {
    const result = compare(profile, [
      goal("a", 100, 2000),
      goal("b", 200, 600),
    ]);
    expect(result.overdrawn).toBe(true);
  });

  it("still computes the dates an overdrawn plan implies", () => {
    // Permitted and computed, never blocked (ADR 0024). The screen says the
    // money is not there; the engine does not withhold the arithmetic.
    const result = compare(profile, [
      goal("a", 6000, 2000),
      goal("b", 3000, 600),
    ]);
    expect(result.rows[0]?.months).toBe(3);
    expect(result.rows[1]?.months).toBe(5);
  });

  it("is true against a non-positive disposable as soon as anything is assigned", () => {
    const overspent = { ...profile, salary: 1000, expenses: 1500 };
    expect(compare(overspent, [goal("a", 100, 50)]).overdrawn).toBe(true);
  });

  it("is false when nothing is assigned, whatever the disposable", () => {
    const overspent = { ...profile, salary: 1000, expenses: 1500 };
    expect(compare(overspent, [goal("a", 100)]).overdrawn).toBe(false);
  });
});

describe("the solo baseline and the Delay", () => {
  it("measures alone against the whole disposable and the whole savings pot", () => {
    // 2500 disposable. Alone, a 5000 goal takes 2 months; nothing else is
    // taking a cut of either resource, which is what "alone" means.
    const [row] = compare(profile, [goal("a", 5000, 500)]).rows;
    expect(row?.monthsAlone).toBe(2);
  });

  it("counts savings in full against the solo baseline", () => {
    const saved = { ...profile, savings: 2500 };
    const [row] = compare(saved, [goal("a", 5000, 500)]).rows;
    // 5000 − 2500 saved = 2500 remaining ÷ 2500 disposable = 1 month.
    expect(row?.monthsAlone).toBe(1);
  });

  it("is the difference between the shared months and the solo months", () => {
    // 1200 at 100/mo = 12 months; alone at 2500/mo = 0.48 months.
    const [row] = compare(profile, [goal("a", 1200, 100)]).rows;
    expect(row?.months).toBe(12);
    expect(row?.monthsAlone).toBe(0.48);
    expect(row?.delay).toBeCloseTo(11.52, 10);
  });

  it("is zero when a goal's Share is the whole disposable", () => {
    // Not "when it is the only Shared goal" — the baseline is the whole
    // disposable, so a goal commanding all of it is not late at all.
    const [row] = compare(profile, [goal("a", 5000, 2500)]).rows;
    expect(row?.delay).toBe(0);
  });

  it("is positive for a lone goal assigned less than the whole disposable", () => {
    // The contradictory bullet in #156 claimed this was zero. One goal given
    // 100 of a 2500 surplus is not commanding all of it, and the Delay says so.
    const [row] = compare(profile, [goal("a", 5000, 100)]).rows;
    expect(row?.delay).toBeGreaterThan(0);
  });

  it("grows for both goals when two of them split the disposable", () => {
    // The headline case: each goal is later than it would be on its own.
    const result = compare(profile, [
      goal("a", 5000, 1250),
      goal("b", 5000, 1250),
    ]);
    expect(result.rows[0]?.delay).toBeGreaterThan(0);
    expect(result.rows[1]?.delay).toBeGreaterThan(0);
  });

  it("is defined for a goal the verdict engine reports no months for", () => {
    // The reason the baseline is computed here. Alone this takes 40 months, so
    // `evaluateReference` returns monthsToSave: null and the card renders the
    // cut horizon instead — the figure Delay needs is not in the verdict.
    const [row] = compare(profile, [goal("a", 100000, 1000)]).rows;
    expect(row?.monthsAlone).toBe(40);
    expect(row?.delay).toBeCloseTo(60, 10);
  });

  it("has none for an Unassigned goal — not a Delay of zero", () => {
    const result = compare(profile, [goal("a", 1200, 100), goal("b", 900)]);
    expect(result.rows[1]?.monthsAlone).toBeNull();
    expect(result.rows[1]?.delay).toBeNull();
  });

  it("has none when the goal is unreachable even alone", () => {
    // No surplus and savings that do not cover it: there is no baseline to be
    // late against, and inventing Infinity would make the subtraction NaN.
    const overspent = { ...profile, salary: 1000, expenses: 1500 };
    const [row] = compare(overspent, [goal("a", 5000, 100)]).rows;
    expect(row?.monthsAlone).toBeNull();
    expect(row?.delay).toBeNull();
  });

  it("is zero for a goal savings already cover, which is late by nothing", () => {
    const saved = { ...profile, savings: 9000 };
    const [row] = compare(saved, [goal("a", 800, 100)]).rows;
    expect(row?.months).toBe(0);
    expect(row?.monthsAlone).toBe(0);
    expect(row?.delay).toBe(0);
  });

  it("is never negative while the plan is affordable", () => {
    // A Share is at most the whole disposable unless the Shares Overdraw it,
    // so months >= monthsAlone holds in every honest plan.
    const result = compare(profile, [
      goal("a", 4000, 900),
      goal("b", 7000, 1600),
    ]);
    expect(result.overdrawn).toBe(false);
    for (const row of result.rows) {
      expect(row.delay ?? 0).toBeGreaterThanOrEqual(0);
    }
  });

  it("goes negative only on an Overdrawn plan, where it is the signature", () => {
    // Assigned more than exists, so the goal appears to arrive sooner than it
    // could. That is not nonsense — it is what spending absent money looks
    // like, and #158 is where the screen says so.
    const result = compare(profile, [goal("a", 5000, 5000)]);
    expect(result.overdrawn).toBe(true);
    expect(result.rows[0]?.delay).toBeLessThan(0);
  });
});

describe("no output is ever ill-formed", () => {
  // The verdict engine promises never to emit NaN; this seam inherits the
  // promise. Every case above plus the degenerate ones, swept in one place so
  // a new branch cannot quietly start returning Infinity.
  const cases: Array<[string, ReferenceProfile, ComparableGoal[]]> = [
    ["no goals", profile, []],
    ["nothing assigned", profile, [goal("a", 100), goal("b", 0)]],
    // The 0/0 case specifically: a goal opted in with no amount typed yet is
    // the only Share, so the assigned total is zero and the savings split
    // divides by it. Reading zero as Unassigned is what avoids the NaN, and
    // this case is here so a change to that reading cannot pass quietly.
    [
      "a zero Share and nothing else",
      { ...profile, savings: 5000 },
      [goal("a", 100, 0)],
    ],
    ["zero Shares only", profile, [goal("a", 100, 0), goal("b", 200, 0)]],
    ["zero-price goal", profile, [goal("a", 0, 100)]],
    ["zero savings", profile, [goal("a", 1000, 100)]],
    [
      "savings exceeding every price",
      { ...profile, savings: 1e6 },
      [goal("a", 10, 1)],
    ],
    [
      "negative disposable",
      { ...profile, salary: 0, expenses: 900 },
      [goal("a", 100, 50)],
    ],
    [
      "zero disposable",
      { ...profile, salary: 500, expenses: 500 },
      [goal("a", 100, 50)],
    ],
    ["overdrawn", profile, [goal("a", 100, 9999), goal("b", 100, 9999)]],
    ["tiny share against a huge price", profile, [goal("a", 1e9, 0.01)]],
    [
      "hostile negative savings",
      { ...profile, savings: -1 },
      [goal("a", 100, 10)],
    ],
  ];

  it.each(cases)("stays finite and non-negative: %s", (_label, p, goals) => {
    const result = compare(p, goals);

    expect(Number.isFinite(result.assigned)).toBe(true);
    expect(result.assigned).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.monthlyDisposable)).toBe(true);

    for (const row of result.rows) {
      expect(Number.isFinite(row.openingBalance)).toBe(true);
      expect(row.openingBalance).toBeGreaterThanOrEqual(0);
      if (row.share !== null) {
        expect(Number.isFinite(row.share)).toBe(true);
        expect(row.share).toBeGreaterThan(0);
      }
      if (row.months !== null) {
        expect(Number.isFinite(row.months)).toBe(true);
        expect(row.months).toBeGreaterThanOrEqual(0);
      }
      if (row.monthsAlone !== null) {
        expect(Number.isFinite(row.monthsAlone)).toBe(true);
        expect(row.monthsAlone).toBeGreaterThanOrEqual(0);
      }
      // Delay is checked for finiteness but NOT for sign: it is legitimately
      // negative on an Overdrawn plan. NaN is the failure this catches, and
      // it is one subtraction away in every branch where a baseline is absent.
      if (row.delay !== null) {
        expect(Number.isFinite(row.delay)).toBe(true);
      }
      // The two travel together: a Delay without a baseline is a subtraction
      // from nothing, and a baseline without a Delay is a figure nobody uses.
      expect(row.delay === null).toBe(row.monthsAlone === null);
    }
  });
});

describe("purity", () => {
  it("does not mutate the goals it is given", () => {
    const goals = [goal("a", 1000, 100), goal("b", 2000)];
    const before = JSON.stringify(goals);
    compare(profile, goals);
    expect(JSON.stringify(goals)).toBe(before);
  });

  it("returns equal results for equal inputs", () => {
    const goals = [goal("a", 1000, 100), goal("b", 2000, 300)];
    expect(compare(profile, goals)).toEqual(compare(profile, goals));
  });
});
