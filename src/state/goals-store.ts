/**
 * A reference Saved Goal (docs/affordo-context.md §8): a named purchase the user
 * has snapshotted. Unlike the legacy `src/ui/goals.ts` shape, it stores NO
 * Verdict — verdicts are always recomputed from the current Profile — and adds a
 * free-text `note` and a `createdAt` timestamp.
 */
export interface Goal {
  id: string;
  name: string;
  price: number;
  note: string;
  createdAt: number;
}

const KEY = "affordo.goals";
const SCHEMA_VERSION = 1;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * A stored Goal is usable only if its whole shape survived AND its `price` is
 * within domain — non-negative (issue #81). A negative price is the right type
 * but domain-invalid: a hostile or corrupt localStorage record that never
 * passed through the goal-entry input layer, and would drive nonsense verdict
 * math. Zero is kept (a legitimately free item). Such rows are dropped (ADR
 * 0011 defensive load, ADR 0019 store range validation).
 */
function isGoal(value: unknown): value is Goal {
  if (typeof value !== "object" || value === null) return false;
  const g = value as Record<string, unknown>;
  return (
    typeof g.id === "string" &&
    typeof g.name === "string" &&
    isFiniteNumber(g.price) &&
    g.price >= 0 &&
    typeof g.note === "string" &&
    isFiniteNumber(g.createdAt)
  );
}

/** Load the saved Goals, or [] if absent, unreadable, or from a foreign schema. */
export function loadGoals(): Goal[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as {
      schemaVersion?: number;
      goals?: unknown;
    };
    if (
      parsed.schemaVersion !== SCHEMA_VERSION ||
      !Array.isArray(parsed.goals)
    ) {
      return [];
    }
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
