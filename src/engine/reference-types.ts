/**
 * Affordo reference engine — public types.
 *
 * This is the reference-semantics engine (ADR 0015/0016/0017), introduced
 * additively alongside the legacy three-way engine in `evaluate.ts`. Money here
 * is plain currency units as floating-point numbers (NOT integer cents) — this
 * mirrors the reference implementation and supersedes ADR 0012 for this engine.
 */

export type Currency = "EUR" | "USD" | "GBP";

/**
 * The four reference Affordability Verdict outcomes:
 * - afford: current savings already cover the price.
 * - stretch: reachable within 12 months by saving the full monthly disposable.
 * - cutToAfford: reachable in 12 months only by cutting expenses (≤ 50% of them).
 * - cannot: no realistic path within the reference horizon.
 */
export type ReferenceVerdictKind = "afford" | "stretch" | "cutToAfford" | "cannot";

/**
 * Profile inputs for the reference engine. All fields are plain numbers.
 * `monthlyContribution` defaults to 0 when absent.
 */
export interface ReferenceProfile {
  currency: Currency;
  /** Monthly take-home pay, as entered by the user. */
  salary: number;
  /** Typical contracted hours per week. */
  hoursPerWeek: number;
  /** Contracted hours in one work day. */
  hoursPerDay: number;
  /** Pay periods per year (e.g. 12, or 14 in parts of Europe). */
  paymentsPerYear: number;
  /** Recurring monthly expenses. */
  expenses: number;
  /** Significance threshold, as a percentage of monthly income. */
  threshold: number;
  /** Money already available toward the purchase. */
  savings: number;
  /** Optional custom extra monthly contribution; treated as 0 when absent. */
  monthlyContribution?: number;
}

/** Goal input the reference engine needs. */
export interface ReferenceGoal {
  price: number;
}

/**
 * The reference Verdict shape. Non-chosen numeric fields
 * (`monthsToSave`, `cutPct`, `cutMonths`) are `null`.
 */
export interface ReferenceVerdict {
  kind: ReferenceVerdictKind;
  /** Take-home pay per hour; 0 when hoursPerWeek is 0. */
  hourlyRate: number;
  /** Hours of work the price costs; Infinity when hourlyRate is 0. */
  hoursOfWork: number;
  /** Work days the price costs; Infinity when hoursPerDay is 0. */
  daysOfWork: number;
  /** Price as a percentage of monthly income; Infinity when salary is 0. */
  pctOfMonthlyIncome: number;
  /** Whether the purchase exceeds the significance threshold. */
  aboveThreshold: boolean;
  /** salary − expenses + monthlyContribution. */
  monthlyDisposable: number;
  /** Months to save (stretch path); otherwise null. */
  monthsToSave: number | null;
  /** Required percentage cut to expenses (cutToAfford path); otherwise null. */
  cutPct: number | null;
  /** Horizon in months for the expense cut (cutToAfford path); otherwise null. */
  cutMonths: number | null;
}
