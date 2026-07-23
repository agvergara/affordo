/**
 * Affordo engine — public types.
 *
 * Money is integer minor units (cents) everywhere (ADR 0012). See CONTEXT.md
 * for the domain vocabulary used here.
 */

export type Cents = number;

export type WorkTimeUnit = "hours" | "work-days" | "work-weeks" | "work-months";

export interface Income {
  /** Net take-home for one pay period, entered by the user as a "monthly" figure. */
  monthlyNet: Cents;
  /** Typical contracted hours per week (UI default 40). */
  hoursPerWeek: number;
  /** Pay periods per year — 12, or 14 where common in Europe (UI default 12). */
  paymentsPerYear: number;
}

export interface Profile {
  income: Income;
  /** Contracted hours in one work day, used to build Work-Time Units (UI default 8). */
  hoursPerDay: number;
  /** Current money available toward purchases (ADR: Savings). */
  savings: Cents;
  /** Estimated recurring monthly expenses. Income − this is the Surplus. */
  monthlyExpenses: Cents;
  /** Optional custom monthly Contribution toward a goal; defaults to full Surplus, capped at it. */
  monthlyContribution?: Cents;
}

export interface Purchase {
  price: Cents;
}

export interface Settings {
  currency: "EUR" | "GBP" | "USD";
}

export interface TimeCost {
  /** Raw work-hours the purchase costs. */
  hours: number;
  /** The same cost expressed in the most readable Work-Time Unit for its magnitude. */
  display: { value: number; unit: WorkTimeUnit };
}

/**
 * The Affordability Verdict (three outcomes; see CONTEXT.md):
 * - affordable-now: current Savings already cover the price.
 * - save-up: reachable by saving Surplus; `months` is whole periods, rounded up.
 * - not-reachable: Surplus ≤ 0, no save-up path; `monthlyShortfall` is the gap.
 */
export type Verdict =
  | { kind: "affordable-now" }
  | { kind: "save-up"; months: number }
  | { kind: "not-reachable"; monthlyShortfall: Cents };

export interface Evaluation {
  /** Per-hour value of the user's time, rounded to whole cents for display. */
  netHourlyWage: Cents;
  timeCost: TimeCost;
  verdict: Verdict;
}
