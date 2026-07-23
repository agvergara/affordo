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

export interface Evaluation {
  /** Per-hour value of the user's time, rounded to whole cents for display. */
  netHourlyWage: Cents;
  timeCost: TimeCost;
}
