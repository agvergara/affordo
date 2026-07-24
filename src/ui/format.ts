import { formatAmount } from "../engine";
import type { Settings, Verdict, WorkTimeUnit } from "../engine";

const CURRENCY_SYMBOL: Record<Settings["currency"], string> = {
  EUR: "€",
  GBP: "£",
  USD: "$",
};

/** Money with its currency symbol, e.g. `formatMoney(750, "EUR")` → "€7,50". */
export function formatMoney(
  cents: number,
  currency: Settings["currency"],
): string {
  return `${CURRENCY_SYMBOL[currency]}${formatAmount(cents)}`;
}

const UNIT_NOUN: Record<WorkTimeUnit, string> = {
  hours: "hour",
  "work-days": "work day",
  "work-weeks": "work week",
  "work-months": "work month",
};

/** Human-readable Time Cost, e.g. `formatTimeCost(2, "work-weeks")` → "2 work weeks". */
export function formatTimeCost(value: number, unit: WorkTimeUnit): string {
  const noun = UNIT_NOUN[unit];
  return `${value} ${noun}${value === 1 ? "" : "s"}`;
}

/**
 * The Significance-Threshold Challenge copy (ADR 0010): provocative but never
 * shaming — it challenges the decision by making the Time Cost tangible and
 * invites a pause, and never nudges toward spending.
 */
export function formatChallenge(value: number, unit: WorkTimeUnit): string {
  return `This is a significant purchase — ${formatTimeCost(
    value,
    unit,
  )} of your working life. Worth pausing on before you decide?`;
}

/** Human-readable Affordability Verdict. */
export function formatVerdict(
  verdict: Verdict,
  currency: Settings["currency"],
): string {
  switch (verdict.kind) {
    case "affordable-now":
      return "You can afford this right now.";
    case "save-up": {
      const m = verdict.months;
      return `You can afford this in about ${m} month${m === 1 ? "" : "s"} if you save your surplus.`;
    }
    case "not-reachable": {
      const lever = "Trimming expenses would put this within reach.";
      // A Surplus of exactly zero is still Not Reachable (nothing left to save),
      // but the shortfall is €0,00 — so "you're €0,00 short" would be nonsense.
      // Name the break-even instead of a zero gap.
      if (verdict.monthlyShortfall <= 0) {
        return `Not reachable at your current rate — your income only just covers your expenses, so there's nothing spare to save. ${lever}`;
      }
      return `Not reachable at your current rate — you're ${formatMoney(
        verdict.monthlyShortfall,
        currency,
      )} short each month. ${lever}`;
    }
  }
}
