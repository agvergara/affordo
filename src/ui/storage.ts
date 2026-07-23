import type { Settings, ThresholdBasis } from "../engine";
import type { ExpenseRow } from "./expenses";

/** The persisted financial profile (ADR 0011 — plain, versioned localStorage). */
export interface PersistedProfile {
  income: string;
  savings: string;
  windfall: string;
  contribution: string;
  monthlyExpenses: string;
  expenseRows: ExpenseRow[];
  paymentsPerYear: number;
  hoursPerWeek: number;
  currency: Settings["currency"];
  /** Significance Threshold percentage (default 10). */
  thresholdPercent: number;
  /** Significance Threshold reference period (default "monthly"). */
  thresholdBasis: ThresholdBasis;
}

const KEY = "affordo.profile";
const SCHEMA_VERSION = 1;

/** Load the saved profile, or null if absent, unreadable, or from another schema. */
export function loadProfile(): PersistedProfile | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      schemaVersion?: number;
      profile?: PersistedProfile;
    };
    if (parsed.schemaVersion !== SCHEMA_VERSION || !parsed.profile) return null;
    // Backfill fields added after a profile was first saved, so the returned
    // shape always satisfies PersistedProfile (no undefined slipping through).
    const profile = parsed.profile;
    return {
      ...profile,
      windfall: profile.windfall ?? "",
      contribution: profile.contribution ?? "",
      expenseRows: profile.expenseRows ?? [],
      paymentsPerYear: profile.paymentsPerYear ?? 12,
      thresholdPercent: profile.thresholdPercent ?? 10,
      thresholdBasis: profile.thresholdBasis ?? "monthly",
    };
  } catch {
    return null;
  }
}

export function saveProfile(profile: PersistedProfile): void {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, profile }),
    );
  } catch {
    // Ignore write failures (private mode, quota) — persistence is best-effort.
  }
}
