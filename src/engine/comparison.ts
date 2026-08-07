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
 * Money is compared against this rather than against zero.
 *
 * The solve subtracts a rate times a duration from a balance it computed by
 * dividing, so a goal that should land exactly on its price lands a fraction of
 * a cent either side of it. Testing `> 0` would leave such a goal "active" with
 * 1e-13 outstanding, and the next round would divide by a rate to find how long
 * that takes — arriving at a completion time indistinguishable from the last
 * one, and burning a round to move the clock nowhere.
 *
 * A hundredth of a cent is far below anything money can mean and far above the
 * error a few divisions accumulate.
 */
const SETTLED = 1e-9;

/**
 * Hand the savings pot out in proportion to Share, capping each goal at what it
 * costs and re-offering the remainder to the goals still short.
 *
 * The cap is what makes this a loop rather than a multiplication. A goal whose
 * proportional cut exceeds its price cannot use the excess — it is bought — and
 * money stranded against something already paid for would make every other
 * goal's date pessimistic for no reason. Re-offering can over-cover the next
 * goal in turn, so it repeats until the pot is spent or nobody is short.
 *
 * Returns the amount each goal actually received, positionally.
 */
function allocateSavings(
  goals: readonly ComparableGoal[],
  shares: readonly (number | null)[],
  savings: number,
): number[] {
  const received = goals.map(() => 0);
  let pool = savings;

  // Each pass either exhausts the pool or fully covers at least one goal, so
  // this cannot run more times than there are goals.
  for (let pass = 0; pass < goals.length && pool > SETTLED; pass += 1) {
    const shortfalls = goals.map((goal, i) => {
      const share = shares[i];
      if (share === null || share === undefined) return 0;
      return Math.max(0, goal.price - (received[i] ?? 0));
    });
    const claiming = shares.reduce(
      (total: number, share, i) =>
        total + ((shortfalls[i] ?? 0) > 0 ? (share ?? 0) : 0),
      0,
    );
    if (claiming <= 0) break;

    let handed = 0;
    for (let i = 0; i < goals.length; i += 1) {
      const shortfall = shortfalls[i] ?? 0;
      if (shortfall <= 0) continue;
      const give = Math.min(shortfall, (pool * (shares[i] ?? 0)) / claiming);
      received[i] = (received[i] ?? 0) + give;
      handed += give;
    }
    if (handed <= SETTLED) break;
    pool -= handed;
  }

  return received;
}

/**
 * Run the plan forward and record when each goal is funded (#157).
 *
 * The whole assigned monthly stays committed throughout: when a goal completes,
 * the Share it was consuming is redistributed among those still saving, in
 * proportion to their Shares. That reduces to one rate — a goal's effective
 * monthly is `share * assigned / (shares still active)` — so the last goal
 * standing draws the entire assigned amount, and nothing is idle while anything
 * is unfunded.
 *
 * Event-driven rather than stepped month by month: solve for the earliest
 * completion, jump the clock to it, redistribute, repeat. Each round retires at
 * least one goal, so it terminates in at most one round per goal, and the
 * answer is exact rather than quantised to whole months.
 *
 * Returns each goal's completion time in months, positionally; `0` for a goal
 * its opening balance already covers.
 */
function solveTimeline(
  goals: readonly ComparableGoal[],
  shares: readonly (number | null)[],
  opened: readonly number[],
  assigned: number,
): (number | null)[] {
  // `null`, not `0`. An unsolved goal must never be indistinguishable from one
  // funded at month zero: zero is the single most wrong value available here,
  // because the screen renders it as "Funded through savings". Seeding the
  // array with it turned a scheduling failure into an affirmative false
  // statement about money the user does not have.
  const months: (number | null)[] = goals.map(() => null);
  const owed = goals.map((goal, i) => {
    const share = shares[i];
    if (share === null || share === undefined) return 0;
    return Math.max(0, goal.price - (opened[i] ?? 0));
  });

  const active = new Set<number>();
  for (let i = 0; i < goals.length; i += 1) {
    if (shares[i] === null || shares[i] === undefined) continue;
    // Already covered by its opening balance: funded before the clock starts.
    if ((owed[i] ?? 0) <= SETTLED) months[i] = 0;
    else active.add(i);
  }
  if (assigned <= 0) return months;

  let clock = 0;
  // Exactly one round per goal is now sufficient, because every round retires
  // the goal it solved for — see below. The bound is a real guarantee rather
  // than the "belt and braces" it used to claim to be.
  for (let round = 0; round < goals.length && active.size > 0; round += 1) {
    let activeShare = 0;
    for (const i of active) activeShare += shares[i] ?? 0;
    if (activeShare <= 0) break;

    // Time until each active goal is funded at its current effective rate. The
    // earliest is the next event, and we keep WHICH goal it was.
    let step = Infinity;
    let next = -1;
    for (const i of active) {
      const rate = ((shares[i] ?? 0) * assigned) / activeShare;
      if (rate <= 0) continue;
      const due = (owed[i] ?? 0) / rate;
      if (due < step) {
        step = due;
        next = i;
      }
    }
    if (!Number.isFinite(step) || next < 0) break;

    clock += step;
    for (const i of active) {
      const rate = ((shares[i] ?? 0) * assigned) / activeShare;
      owed[i] = (owed[i] ?? 0) - rate * step;
    }

    // Retire `next` because we SOLVED for it, not because the subtraction
    // happened to land under an epsilon.
    //
    // Trusting the epsilon was a real bug. `SETTLED` is 1e-9, but one ulp of a
    // balance near 1e7 is already larger than that — so `owed - rate * step`
    // could leave ~2e-9 behind on the very goal the step was computed to
    // finish. It stayed active, the round was spent moving the clock nowhere,
    // and with the loop bounded by the goal count a later goal was never
    // solved at all. It then reported month zero.
    //
    // By construction `next` is the goal whose remaining balance the step was
    // sized to clear, so retiring it is exact regardless of what the floating
    // point subtraction left behind.
    months[next] = clock;
    active.delete(next);

    // Anything else that genuinely landed at the same instant retires with it —
    // two goals can be funded in the same month, and leaving one active would
    // hand it a Share it no longer needs.
    for (const i of [...active]) {
      if ((owed[i] ?? 0) <= SETTLED) {
        months[i] = clock;
        active.delete(i);
      }
    }
  }

  return months;
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
 * Months come from an event-driven solve rather than a division (#157): find
 * the goal that completes first, advance the clock to it, redistribute the
 * Share it was consuming, repeat.
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

  const opened = allocateSavings(goals, shares, savings);
  // With no surplus there is no monthly money to schedule, whatever the Shares
  // say (#158). Savings still divide — a goal its opening balance covers is
  // genuinely bought — but nothing else is ever funded, so the solve is not run
  // and those goals carry no months rather than a figure built on money that
  // does not exist.
  const hasSurplus = monthlyDisposable > 0;
  const funded: (number | null)[] = hasSurplus
    ? solveTimeline(goals, shares, opened, assigned)
    : goals.map(() => null);

  const rows: ComparisonRow[] = goals.map((goal, index) => {
    const share = shares[index] ?? null;

    // The solo baseline never depended on the Share — it is this goal measured
    // alone, against everything the user has. Nulling it for Unassigned goals
    // (#156) was over-cautious rather than correct, and #170 needs it: a goal
    // outside the plan can still be one savings would cover.
    const remainingAlone = Math.max(0, goal.price - savings);
    const monthsAlone =
      remainingAlone === 0
        ? 0
        : monthlyDisposable > 0
          ? remainingAlone / monthlyDisposable
          : // Unreachable even alone, so there is no baseline to be late
            // against. A duration cannot be compared to one that does not
            // exist, and inventing Infinity here would make Delay NaN.
            null;

    if (share === null) {
      return {
        goalId: goal.id,
        share: null,
        openingBalance: 0,
        months: null,
        monthsAlone,
        // Still null, and for the unchanged reason: the goal is outside the
        // plan, so it has no months in the plan to compare the baseline to.
        delay: null,
      };
    }

    const openingBalance = opened[index] ?? 0;
    const covered = openingBalance >= goal.price - SETTLED;
    // Funded from savings alone is true regardless of surplus. Everything else
    // needs monthly money, so with no surplus it is unreachable rather than
    // slow, and `null` says that without inventing a duration (#158).
    // `?? null`, never `?? 0`. A goal the solve did not reach has no answer,
    // and defaulting it to zero is what let an unfundable goal report itself
    // funded from savings it never had.
    const months = hasSurplus ? (funded[index] ?? null) : covered ? 0 : null;

    return {
      goalId: goal.id,
      share,
      openingBalance,
      months,
      monthsAlone,
      // Both sides must exist. `months` became nullable with the no-surplus
      // rule (#158), and JS would have coerced `null - 4` to -4 — a goal that
      // can never be funded reporting that it arrives four months EARLY. The
      // reachable case is a goal savings would cover on its own but not once
      // they are split, on a profile with no surplus: alone it is instant, in
      // the plan it is unreachable, and the distance between those is not a
      // number.
      //
      // Otherwise: non-negative whenever the plan is affordable, since a Share
      // can only be at most the whole disposable unless the Shares Overdraw it.
      // A NEGATIVE Delay is not nonsense — it is the precise signature of an
      // Overdrawn plan, where a goal appears to arrive sooner than it could
      // because the plan spends money that is not there.
      delay:
        months === null || monthsAlone === null ? null : months - monthsAlone,
    };
  });

  // What the plan spends, and what survives it. Totalled here rather than in
  // the screen so there is one place it can be wrong, and so a component
  // cannot quietly disagree with the engine about how much money is left.
  const savingsDrawn = rows.reduce(
    (total, row) => total + row.openingBalance,
    0,
  );

  return {
    monthlyDisposable,
    assigned,
    savingsDrawn,
    // Clamped only against rounding: `allocateSavings` caps each goal at its
    // price and stops when the pot is empty, so this cannot go meaningfully
    // negative. The guard is there so a float remainder never renders as
    // "-0,00 €", which reads as a bug whatever the arithmetic says.
    savingsLeft: Math.max(0, savings - savingsDrawn),
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
