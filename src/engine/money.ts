import type { Cents } from "./types";

/**
 * European money formatting (ADR 0012, CONTEXT.md "Localization").
 * Decimal comma, dot thousands separator. Values are integer cents so summing
 * never drifts.
 */

/**
 * The outcome of parsing a user-entered amount. A total function: a valid
 * amount (including a real "0,00") is distinguished from empty and unparseable
 * input, so no caller can mistake one for another and no NaN reaches the engine.
 */
export type ParsedAmount =
  | { ok: true; cents: Cents }
  | { ok: false; reason: "empty" | "invalid" };

/** Parse a European-formatted amount (e.g. "1.234,56") into integer cents. */
export function parseAmount(input: string): ParsedAmount {
  const trimmed = input.trim();
  if (trimmed === "") return { ok: false, reason: "empty" };
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value)) return { ok: false, reason: "invalid" };
  return { ok: true, cents: Math.round(value * 100) };
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
