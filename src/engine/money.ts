import type { Cents } from "./types";

/**
 * European money formatting (ADR 0012, CONTEXT.md "Localization").
 * Decimal comma, dot thousands separator. Values are integer cents so summing
 * never drifts.
 */

/** Parse a European-formatted amount (e.g. "1.234,56") into integer cents. */
export function parseAmount(input: string): Cents {
  const normalized = input.trim().replace(/\./g, "").replace(",", ".");
  return Math.round(Number(normalized) * 100);
}

/** Format integer cents into European notation (e.g. 123456 → "1.234,56"). */
export function formatAmount(cents: Cents): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${grouped},${fraction}`;
}
