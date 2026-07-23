import { formatAmount } from "../engine";
import type { Settings, WorkTimeUnit } from "../engine";

const CURRENCY_SYMBOL: Record<Settings["currency"], string> = {
  EUR: "€",
  GBP: "£",
  USD: "$",
};

/** Money with its currency symbol, e.g. `formatMoney(750, "EUR")` → "€7,50". */
export function formatMoney(cents: number, currency: Settings["currency"]): string {
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
