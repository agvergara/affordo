/**
 * The Comparison engine — public types (ADR 0024).
 *
 * A Comparison is every saved Goal, the Share each one carries, and the
 * timeline that follows from dividing one Monthly Disposable between them.
 * A goal's own Verdict is **not** part of it: `evaluateReference` still answers
 * "can I afford this?" for one goal alone, and nothing here changes that.
 *
 * Money is plain currency units as floating-point numbers, matching the verdict
 * engine (ADR 0017). Durations are fractional months and are never rounded —
 * rounding is presentational, as it is there.
 */

/**
 * One saved Goal's place in the Comparison. One row per goal, whether or not it
 * carries a Share, so the shape of this list always matches the goal list.
 */
export interface ComparisonRow {
  /** The Goal this row describes. */
  goalId: string;
  /**
   * The monthly amount assigned to this goal, or `null` when it is
   * **Unassigned**.
   *
   * Unassigned is a state, not a rate: such a goal draws nothing, releases
   * nothing, and shifts no other goal's Delay. A stored share of `0` reads as
   * Unassigned rather than as "takes forever" — the two are the same thing, and
   * modelling zero as an infinite duration would also strip the goal of its
   * share of savings, so a goal readable as Afford would read as never.
   */
  share: number | null;
  /**
   * This goal's cut of existing savings, derived from its cut of the assigned
   * monthly. Always `0` for an Unassigned goal, and never negative.
   */
  openingBalance: number;
  /**
   * Months to fund the goal at its Share, or `null` when Unassigned. `0` when
   * the opening balance already covers the price.
   */
  months: number | null;
  /**
   * What this goal would take **alone** — commanding the whole Monthly
   * Disposable and the whole savings pot, because alone means nothing else is
   * taking a cut of either.
   *
   * Computed for **every** goal, Shared or not — it never depended on the
   * Share. `0` means savings alone cover the price, which is how an Unassigned
   * goal can still be reported as funded through savings (#170).
   *
   * `null` only when the goal is unreachable even alone: a non-positive
   * disposable and a price savings do not cover. There is no baseline to be
   * late against, and inventing Infinity would make Delay `NaN`.
   */
  monthsAlone: number | null;
  /**
   * Months this goal takes beyond what it would take alone — the number behind
   * "buying X delays Y". `null` whenever `monthsAlone` is.
   *
   * Zero when a goal's Share is the whole Monthly Disposable, not merely when
   * it is the only Shared goal: one goal assigned €100 of a €2500 surplus is
   * not commanding all of it, and says so.
   *
   * May be **negative**, and only when the plan is Overdrawn — a goal cannot
   * arrive sooner than it would alone unless the plan spends money that is not
   * there.
   */
  delay: number | null;
}

/** Every saved Goal, its Share, and the timeline that follows. */
export interface Comparison {
  /** `salary − expenses + monthlyContribution`. May be zero or negative. */
  monthlyDisposable: number;
  /** The Shares, totalled. `0` when nothing is assigned. */
  assigned: number;
  /**
   * How much of the savings pot the plan actually spends — the opening
   * balances, totalled (#172).
   *
   * Only goals **in** the plan draw. A goal outside it has an opening balance
   * of zero and contributes nothing here, even when the screen reports that
   * savings would cover it on its own.
   */
  savingsDrawn: number;
  /**
   * What is left of the savings pot once the plan has taken its share. Never
   * negative: the allocation caps each goal at its price and stops when the
   * pot is empty, so the plan cannot spend money that is not there.
   */
  savingsLeft: number;
  /**
   * Whether the Shares total more than there is to divide. Computed here, never
   * used to block input — an over-committed plan is arithmetically fine and
   * merely untrue, which is a different thing from nonsense (ADR 0024).
   */
  overdrawn: boolean;
  /** One row per saved Goal, in the order the goals were given. */
  rows: ComparisonRow[];
}
