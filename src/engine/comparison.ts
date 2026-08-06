import type { Comparison, ComparisonRow } from "./comparison-types";
import type { ReferenceProfile } from "./reference-types";

/** What the Comparison needs of a saved Goal. */
export interface ComparableGoal {
  id: string;
  price: number;
  /** The assigned monthly amount. Absent, zero or invalid means Unassigned. */
  share?: number;
}

/**
 * A Share counts only when it is a positive, finite number.
 *
 * Absent, zero and negative all collapse to the same answer — **Unassigned** —
 * because they describe the same situation: the goal is not in the plan. Zero
 * is the interesting one. It is the value a goal takes the moment a user opts
 * it in without typing an amount, and reporting that as an infinite duration
 * would be false twice over: the goal is not slow, and under the derived-savings
 * rule a zero Share also takes zero savings, so a goal the user can already
 * afford would read as unreachable (ADR 0024).
 *
 * The engine is public and pure, so it does not assume the store's range
 * validation ran — a hand-edited `localStorage` record reaches here directly.
 */
function shareOf(goal: ComparableGoal): number | null {
  const { share } = goal;
  return typeof share === "number" && Number.isFinite(share) && share > 0
    ? share
    : null;
}

/**
 * Divide one Monthly Disposable between competing goals (ADR 0024).
 *
 * Pure and framework-free (ADR 0008): the same function must serve a future
 * Android app untouched. It never mutates its arguments and never reads a
 * clock — two calls with equal inputs give equal results.
 *
 * `evaluateReference` is deliberately **not** called from here. That function
 * answers a different question (this goal, alone, against everything the user
 * has) and its output is what `/goals` renders; a Comparison must not be able
 * to change it. Where this slice needs the same arithmetic, it does the
 * arithmetic — see the Delay slice, where re-using the verdict's own
 * `monthsToSave` would be a fidelity regression rather than reuse.
 *
 * This slice computes months by plain division. The reflow slice replaces that
 * with an event-driven solve; the returned shape does not change.
 */
export function compare(
  profile: ReferenceProfile,
  goals: readonly ComparableGoal[],
): Comparison {
  const monthlyDisposable =
    profile.salary - profile.expenses + (profile.monthlyContribution ?? 0);

  const shares = goals.map(shareOf);
  const assigned = shares.reduce(
    (total: number, share) => total + (share ?? 0),
    0,
  );

  // A hostile or corrupt profile could carry a negative balance; the store
  // rejects one on load (ADR 0019), but the engine is reachable without it.
  const savings = Math.max(0, profile.savings);

  const rows: ComparisonRow[] = goals.map((goal, index) => {
    const share = shares[index] ?? null;

    if (share === null) {
      return {
        goalId: goal.id,
        share: null,
        openingBalance: 0,
        months: null,
        monthsAlone: null,
        delay: null,
      };
    }

    // Savings follow the Share: a goal taking two thirds of the assigned
    // monthly opens with two thirds of what is already saved. `assigned` is
    // necessarily positive here — this branch only runs when some share is —
    // so the division cannot produce NaN.
    const openingBalance = savings * (share / assigned);
    const remaining = Math.max(0, goal.price - openingBalance);

    return {
      goalId: goal.id,
      share,
      openingBalance,
      // Already covered by the opening balance funds at month zero, which is
      // the honest answer and keeps the figure off Infinity for a free goal.
      months: remaining === 0 ? 0 : remaining / share,
      monthsAlone: null,
      delay: null,
    };
  });

  return {
    monthlyDisposable,
    assigned,
    // `assigned > 0` is load-bearing, not a guard against a divide. Overdrawn
    // describes a *plan* that outruns the money, and a user who has assigned
    // nothing has made no plan — without this, every goal-less profile whose
    // expenses exceed its income would report Overdrawn on the strength of
    // `0 > -500`. That a profile has no surplus is a different statement, and
    // the no-surplus slice makes it separately.
    overdrawn: assigned > 0 && assigned > monthlyDisposable,
    rows,
  };
}
