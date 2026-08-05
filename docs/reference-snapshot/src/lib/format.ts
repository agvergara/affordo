import type { Currency } from "./affordo-types";

function localeFor(currency: Currency): string {
  switch (currency) {
    case "EUR":
      return "de-DE";
    case "GBP":
      return "en-GB";
    case "USD":
    default:
      return "en-US";
  }
}

export function formatMoney(value: number, currency: Currency): string {
  if (!isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat(localeFor(currency), {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function formatNumber(value: number, currency: Currency, digits = 1): string {
  if (!isFinite(value)) return "—";
  return new Intl.NumberFormat(localeFor(currency), {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
}
