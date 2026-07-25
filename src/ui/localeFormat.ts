import type { Settings } from "../engine";

/**
 * Reference-design money/number formatters (issue #42, Parent #39).
 *
 * These reproduce the reference app's locale-by-currency output EXACTLY and are
 * intentionally separate from the app's existing `./format` helpers, whose
 * European-style output (e.g. `€7,50`) the current app still relies on. Do not
 * conflate the two: this module is additive.
 */

export type Currency = Settings["currency"];

/** Em dash (U+2014) shown for non-finite values, matching the reference. */
const EM_DASH = "—";

/**
 * The display locale for a currency, per the reference:
 * `EUR → de-DE` (symbol suffix, e.g. `1.234,56 €`), `GBP → en-GB` (`£1,234.56`),
 * `USD → en-US` (`$1,234.56`). Anything else falls back to `en-US`.
 */
export function localeFor(currency: Currency): string {
  switch (currency) {
    case "EUR":
      return "de-DE";
    case "GBP":
      return "en-GB";
    case "USD":
      return "en-US";
    default:
      return "en-US";
  }
}

/**
 * Money in the currency's reference locale, e.g.
 * `formatMoney(1234.56, "EUR")` → `"1.234,56 €"`, `"USD"` → `"$1,234.56"`.
 * Non-finite input renders an em dash. On any Intl error, falls back to a plain
 * `` `${value.toFixed(2)} ${currency}` `` string.
 */
export function formatMoney(value: number, currency: Currency): string {
  if (!Number.isFinite(value)) return EM_DASH;
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

/**
 * A plain number in the currency's reference locale — used for percentages,
 * days/hours and months. `digits` caps the fraction digits (default 1), with a
 * minimum of 0 so whole values render without trailing zeros. Non-finite input
 * renders an em dash.
 */
export function formatNumber(
  value: number,
  currency: Currency,
  digits = 1,
): string {
  if (!Number.isFinite(value)) return EM_DASH;
  return new Intl.NumberFormat(localeFor(currency), {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
}
