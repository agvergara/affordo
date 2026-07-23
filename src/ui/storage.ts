import type { Settings } from "../engine";

/** The persisted financial profile (ADR 0011 — plain, versioned localStorage). */
export interface PersistedProfile {
  income: string;
  savings: string;
  monthlyExpenses: string;
  hoursPerWeek: number;
  currency: Settings["currency"];
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
    return parsed.profile;
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
