import type { Cents, Verdict } from "../engine";

/** A stored Verdict is usable only if its kind-specific payload is intact. */
function isVerdict(value: unknown): value is Verdict {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  switch (v.kind) {
    case "affordable-now":
      return true;
    case "save-up":
      return typeof v.months === "number";
    case "not-reachable":
      return typeof v.monthlyShortfall === "number";
    default:
      return false;
  }
}

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

/**
 * A stored Goal is only usable if its whole shape survived — a partial record
 * (e.g. a missing or incomplete Verdict) would render NaN/undefined copy, so we
 * drop it rather than trust the schema version alone (mirrors storage.ts's
 * defensive load, ADR 0011).
 */
function isGoal(value: unknown): value is Goal {
  if (typeof value !== "object" || value === null) return false;
  const g = value as Record<string, unknown>;
  return (
    typeof g.id === "string" &&
    typeof g.name === "string" &&
    typeof g.price === "number" &&
    isVerdict(g.verdict)
  );
}

/** Load the saved Goals, or [] if absent, unreadable, or from another schema. */
export function loadGoals(): Goal[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as {
      schemaVersion?: number;
      goals?: unknown;
    };
    if (parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.goals))
      return [];
    return parsed.goals.filter(isGoal);
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
