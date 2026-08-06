/**
 * A reference Saved Goal (docs/affordo-context.md §8): a named purchase the user
 * has snapshotted. Unlike the pre-#39 shape (`src/ui/goals.ts`, deleted in
 * #114), it stores NO
 * Verdict — verdicts are always recomputed from the current Profile — and adds a
 * free-text `note` and a `createdAt` timestamp.
 */
export interface Goal {
  id: string;
  name: string;
  price: number;
  note: string;
  createdAt: number;
  /**
   * The monthly amount assigned to this goal out of the Monthly Disposable
   * (#155, ADR 0024). Absent means **Unassigned** — the goal is not in the
   * Comparison at all, which is the correct reading of every goal saved before
   * the feature existed. That is why `SCHEMA_VERSION` is deliberately NOT
   * bumped for it: see `loadGoals`.
   */
  share?: number;
}

const KEY = "affordo.goals";

/**
 * Deliberately still 1 after `share` was added (#155).
 *
 * `loadGoals` **discards** on a version mismatch — it does not migrate, and
 * ADR 0011's promise that this field exists "to support future migrations" was
 * never built out. So bumping it would silently delete every saved Goal for
 * every existing user, which is the opposite of what a migration is for.
 *
 * No bump is needed anyway: `share` is optional, and absent already means
 * Unassigned, which is the correct reading of a goal saved before the feature
 * existed. The migration is a no-op by construction. `isGoal` also tolerates
 * unknown fields, so an older bundle keeps loading data written by a newer one.
 *
 * Bump this only for a change that genuinely cannot be read by an older bundle
 * — and build the migration in the same commit.
 */
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
    isFiniteNumber(g.createdAt) &&
    isShare(g.share)
  );
}

/**
 * A stored `share` is optional, but when present it must be a non-negative
 * finite number (ADR 0019 range validation, not merely a type check).
 *
 * A row carrying a bad share is **dropped**, matching how a negative `price` is
 * treated: the record never passed through the input layer, so it is corrupt or
 * hostile, and keeping half of it would be a guess about which half is real.
 *
 * Zero is accepted rather than rejected — it is a legitimate value meaning the
 * goal is Unassigned, and the engine reads absent and zero identically.
 */
function isShare(value: unknown): boolean {
  return value === undefined || (isFiniteNumber(value) && value >= 0);
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
