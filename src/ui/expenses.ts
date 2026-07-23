import type { Cents } from "../engine";

export type Frequency = "weekly" | "monthly" | "quarterly" | "annual";

export interface ExpenseItem {
  label: string;
  amount: Cents;
  frequency: Frequency;
}

/** An expense line item as edited in the UI (amount is a raw European string). */
export interface ExpenseRow {
  label: string;
  amount: string;
  frequency: Frequency;
}

const MONTHLY_FACTOR: Record<Frequency, number> = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  annual: 1 / 12,
};

/** Normalize a recurring amount to an average-month figure, in whole cents. */
export function frequencyToMonthly(amount: Cents, frequency: Frequency): Cents {
  return Math.round(amount * MONTHLY_FACTOR[frequency]);
}

/** Total of itemized expenses, each normalized to a monthly figure. */
export function monthlyExpensesTotal(items: ExpenseItem[]): Cents {
  return items.reduce(
    (sum, item) => sum + frequencyToMonthly(item.amount, item.frequency),
    0,
  );
}
