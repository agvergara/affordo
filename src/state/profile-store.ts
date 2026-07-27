import type { Currency } from "../engine/reference-types";

/**
 * The reference Profile (docs/affordo-context.md §8) — the user's finances as
 * plain numbers, persisted to localStorage. This is the reference-semantics
 * state layer, introduced additively alongside the legacy `src/ui/storage.ts`.
 * No stored Verdict lives here; verdicts are always recomputed.
 */
export interface Profile {
  currency: Currency;
  salary: number;
  hoursPerWeek: number;
  hoursPerDay: number;
  paymentsPerYear: number;
  expenses: number;
  threshold: number;
  savings: number;
  monthlyContribution: number;
}

/** The starting Profile before the user has entered anything (§8). */
export const defaultProfile: Profile = {
  currency: "EUR",
  salary: 0,
  hoursPerWeek: 40,
  hoursPerDay: 8,
  paymentsPerYear: 12,
  expenses: 0,
  threshold: 10,
  savings: 0,
  monthlyContribution: 0,
};

const KEY = "affordo.profile";
const SCHEMA_VERSION = 1;

const CURRENCIES: readonly Currency[] = ["EUR", "USD", "GBP"];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** A finite number strictly greater than zero. */
function isPositive(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

/** A finite number at or above zero. */
function isNonNegative(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

/** A finite number within an inclusive `[min, max]` range. */
function isInRange(value: unknown, min: number, max: number): value is number {
  return isFiniteNumber(value) && value >= min && value <= max;
}

/**
 * A stored Profile is usable only if every field is present, the right type,
 * AND within its domain range (issue #81). The type check alone would let a
 * hostile or corrupt localStorage record through — a negative `salary`,
 * `paymentsPerYear: 0`, a `threshold` outside the onboarding slider's 1–50 —
 * and feed nonsense (NaN/Infinity, negative disposable income) into verdict
 * computation. The onboarding input layer is the *primary* enforcement point
 * (dossier §8 `canContinue`); the store is the trust boundary against a value
 * that never passed through it, so it rejects such records whole and falls back
 * to defaults (ADR 0011 defensive load, ADR 0019 store range validation).
 *
 * Ranges: `salary`/`hoursPerWeek`/`hoursPerDay`/`paymentsPerYear` must be > 0
 * (`canContinue`, and the divisors behind hourlyRate/daysOfWork); `expenses`/
 * `savings`/`monthlyContribution` must be ≥ 0; `threshold` is the slider's 1–50.
 */
function isProfile(value: unknown): value is Profile {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    CURRENCIES.includes(p.currency as Currency) &&
    isPositive(p.salary) &&
    isPositive(p.hoursPerWeek) &&
    isPositive(p.hoursPerDay) &&
    isPositive(p.paymentsPerYear) &&
    isNonNegative(p.expenses) &&
    isInRange(p.threshold, 1, 50) &&
    isNonNegative(p.savings) &&
    isNonNegative(p.monthlyContribution)
  );
}

/**
 * Load the saved Profile, or a fresh copy of `defaultProfile` if absent,
 * unreadable, or from a foreign/older schema. Never throws — a broken store
 * degrades to defaults. Every fallback returns a NEW object so callers that
 * edit a profile in place (e.g. the settings draft, dossier §8) can never
 * mutate the shared `defaultProfile` constant.
 */
export function loadProfile(): Profile {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...defaultProfile };
    const parsed = JSON.parse(raw) as {
      schemaVersion?: number;
      profile?: unknown;
    };
    if (parsed.schemaVersion !== SCHEMA_VERSION || !isProfile(parsed.profile)) {
      return { ...defaultProfile };
    }
    return parsed.profile;
  } catch {
    return { ...defaultProfile };
  }
}

export function saveProfile(profile: Profile): void {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, profile }),
    );
  } catch {
    // Ignore write failures (private mode, quota) — persistence is best-effort.
  }
}
