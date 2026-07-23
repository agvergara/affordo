import type { Cents, Verdict } from "../engine";

/**
 * A Saved Goal (see CONTEXT.md): a named purchase the user has snapshotted with
 * its price and Affordability Verdict so it can be revisited. v1 Goals are
 * independent — each keeps the Verdict it was saved with (ADR 0007).
 */
export interface Goal {
  id: string;
  name: string;
  price: Cents;
  verdict: Verdict;
}

const KEY = "affordo.goals";
const SCHEMA_VERSION = 1;

/** Load the saved Goals, or [] if absent, unreadable, or from another schema. */
export function loadGoals(): Goal[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as {
      schemaVersion?: number;
      goals?: Goal[];
    };
    if (parsed.schemaVersion !== SCHEMA_VERSION || !parsed.goals) return [];
    return parsed.goals;
  } catch {
    return [];
  }
}

export function saveGoals(goals: Goal[]): void {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, goals }),
    );
  } catch {
    // Ignore write failures (private mode, quota) — persistence is best-effort.
  }
}
