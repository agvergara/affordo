import { useState } from "react";
import { compare, type Comparison, type ComparisonRow } from "../engine";
import { useAffordo } from "../state/AffordoProvider";
import type { Goal } from "../state/goals-store";
import { AppHeader } from "./AppHeader";
import { formatMoney, formatNumber } from "./localeFormat";

/**
 * `/compare` — the Comparison (#155, ADR 0024).
 *
 * Every saved Goal, the Share each carries, and how long it takes at that
 * Share. The reference has no such screen, so nothing here is reproduced;
 * per ADR 0023 it is composed only from primitives already extracted from the
 * reference — the dashboard's masthead and snapshot grid, the dialog's input
 * base layer, the card's ghost action — so it reads as the same app rather than
 * a second one bolted on.
 *
 * This screen is the **only** place a Share is set or cleared. The goal dialog
 * keeps its three reference-verbatim fields: a Share is meaningless on a first
 * goal, and setting one without the other goals and the running total in view
 * is setting it blind.
 *
 * Deliberately absent until their own slices: Delay (#156), reflow (#157), and
 * the Overdrawn warning (#158). `compare()` already reports `overdrawn`; this
 * screen does not read it yet.
 */
export function CompareScreen() {
  const { profile, goals, setGoals } = useAffordo();

  // What the user is typing, per goal. The committed value is a number on the
  // Goal; a draft is the raw string, because "1." and "" are states a number
  // cannot hold and re-deriving the field from the stored number would fight
  // the user mid-keystroke.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const comparison = compare(profile, goals);
  const rowFor = (id: string) => comparison.rows.find((r) => r.goalId === id);

  const writeShare = (goal: Goal, share: number | undefined) => {
    setGoals(
      goals.map((g) =>
        g.id === goal.id
          ? share === undefined
            ? // Drop the key entirely rather than storing 0, so a cleared goal
              // is byte-identical to one saved before the feature existed.
              (({ share: _cleared, ...rest }) => rest)(g)
            : { ...g, share }
          : g,
      ),
    );
  };

  const onShareInput = (goal: Goal, raw: string) => {
    setDrafts((d) => ({ ...d, [goal.id]: raw }));
    // The same naive parse the goal dialog uses for a price — the reference's
    // own rule, kept rather than improved on for one field.
    const parsed = parseFloat(raw);
    writeShare(
      goal,
      Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
    );
  };

  const clearShare = (goal: Goal) => {
    setDrafts((d) => ({ ...d, [goal.id]: "" }));
    writeShare(goal, undefined);
    // Clear unmounts itself — the button only exists while a Share does — so
    // without this the keyboard user is dropped to <body> and has to tab back
    // in from the top of the document. Focus moves to the field they just
    // emptied, which is both the nearest survivor and where they would go next
    // to type a new amount.
    document.getElementById(`share-${goal.id}`)?.focus();
  };

  const valueFor = (goal: Goal) =>
    drafts[goal.id] ??
    (goal.share !== undefined && goal.share > 0 ? String(goal.share) : "");

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <section
          data-testid="compare-masthead"
          className="mb-10 border-t-4 border-foreground pt-6"
        >
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Affordo
          </p>
          <h1 className="mt-2 font-display text-6xl uppercase leading-none tracking-tight sm:text-8xl">
            Compare
          </h1>

          <div
            data-testid="compare-totals"
            className="mt-6 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3"
          >
            <div data-testid="compare-assigned" className="bg-background p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Assigned
              </p>
              <p className="mt-1 text-xl font-bold tracking-tight">
                {formatMoney(comparison.assigned, profile.currency)}{" "}
                <span className="font-mono text-xs font-normal text-muted-foreground">
                  / month
                </span>
              </p>
            </div>

            <div data-testid="compare-disposable" className="bg-background p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Monthly surplus
              </p>
              <p className="mt-1 text-xl font-bold tracking-tight">
                {formatMoney(comparison.monthlyDisposable, profile.currency)}
              </p>
            </div>

            {/*
              Savings had no cost on this screen until #172: goals drew from
              the pot and nothing said the pot had shrunk, so it read as free
              money — the one resource here without a visible price, while
              every Share is totalled against the surplus in plain sight.

              The headline is what SURVIVES the plan rather than what it spends,
              because that is the number the user actually has afterwards.
            */}
            <div data-testid="compare-savings" className="bg-background p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Savings left
              </p>
              <p className="mt-1 text-xl font-bold tracking-tight">
                {formatMoney(comparison.savingsLeft, profile.currency)}
              </p>
              {comparison.savingsDrawn > 0 && (
                <p
                  data-testid="compare-savings-drawn"
                  className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  {formatMoney(comparison.savingsDrawn, profile.currency)} goes
                  to these goals
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="mb-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          {/*
            Counts goals actually IN the plan, not goals that exist. Counting
            every saved goal made this read "Sharing · 2" directly above
            "Nothing is assigned yet" — two labels on one screen disagreeing
            about the same thing. The dashboard's "Saved goals · n" counts what
            is saved because that is what it is about; this counts what is
            sharing, for the same reason.
          */}
          <span
            data-testid="compare-divider"
            className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
          >
            Sharing · {comparison.rows.filter((r) => r.share !== null).length}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {goals.length === 0 && (
          <div
            data-testid="compare-empty"
            className="border-2 border-dashed border-border p-12 text-center"
          >
            <p className="font-display text-3xl uppercase tracking-tight">
              Nothing to compare yet.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Save a couple of goals, then split your monthly surplus between
              them to see what each one costs the others.
            </p>
          </div>
        )}

        {/*
          The two states where the plan cannot happen (#158).

          Both challenge the PLAN and not the person (ADR 0010): they name the
          gap and the levers, and neither implies the user has done something
          wrong. Neither blocks anything either — Affordo has never blocked bad
          news, only nonsense, and an over-committed plan is arithmetically fine
          and merely untrue.

          `border-l-2` with the accent token rather than a red destructive
          panel: this is a fact about the plan, not an error the user caused,
          and the destructive tone is spent on Remove.
        */}
        {comparison.monthlyDisposable <= 0 && (
          <p
            data-testid="compare-no-surplus"
            className="mb-6 border-l-2 border-accent py-1 pl-3 text-sm"
          >
            <b>No monthly surplus to share.</b>{" "}
            {comparison.monthlyDisposable < 0
              ? "Your expenses exceed your income"
              : "Your expenses meet your income"}
            , so nothing accumulates each month — only what you have already
            saved counts toward these goals.
          </p>
        )}

        {comparison.overdrawn && comparison.monthlyDisposable > 0 && (
          <p
            data-testid="compare-overdrawn"
            className="mb-6 border-l-2 border-accent py-1 pl-3 text-sm"
          >
            <b>
              {formatMoney(
                comparison.assigned - comparison.monthlyDisposable,
                profile.currency,
              )}{" "}
              a month more than you have.
            </b>{" "}
            These dates assume money that is not there. Lower a share, drop a
            goal, or close the gap.
          </p>
        )}

        {goals.length > 0 && comparison.assigned === 0 && (
          <p
            data-testid="compare-none-assigned"
            className="mb-6 text-sm text-muted-foreground"
          >
            Nothing is assigned yet. Give a goal an amount each month and it
            joins the plan.
          </p>
        )}

        {goals.length > 0 && (
          <ul data-testid="compare-list" className="space-y-px bg-border">
            {goals.map((goal) => {
              const row = rowFor(goal.id);
              const assigned = row?.share !== null && row?.share !== undefined;
              return (
                <li
                  key={goal.id}
                  data-testid="compare-item"
                  className="bg-background p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-bold tracking-tight">{goal.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatMoney(goal.price, profile.currency)}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label
                      htmlFor={`share-${goal.id}`}
                      className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                    >
                      Monthly share
                    </label>
                    {/*
                      shadcn's Input base layer, inlined exactly as GoalDialog
                      does. `h-9` is load-bearing: it is what makes this a 36px
                      control rather than whatever the padding alone would give,
                      and it clears the 24x24 target floor (ADR 0022).
                    */}
                    <input
                      id={`share-${goal.id}`}
                      inputMode="decimal"
                      placeholder="0"
                      value={valueFor(goal)}
                      onChange={(e) => onShareInput(goal, e.target.value)}
                      className="h-9 w-28 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                    />

                    {assigned && (
                      <button
                        type="button"
                        onClick={() => clearShare(goal)}
                        className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent px-3 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        Clear
                      </button>
                    )}

                    <div className="ml-auto text-right">
                      <p
                        data-testid="compare-months"
                        className="font-mono text-xs"
                      >
                        {describeMonths(
                          row,
                          goal.price,
                          comparison,
                          profile.currency,
                        )}
                      </p>
                      {describeDelay(row?.delay ?? null, profile.currency) && (
                        <p
                          data-testid="compare-delay"
                          className="font-mono text-[10px] text-muted-foreground"
                        >
                          {describeDelay(row?.delay ?? null, profile.currency)}
                        </p>
                      )}
                      {describeDraw(
                        row,
                        goal,
                        comparison,
                        profile.currency,
                      ) && (
                        <p
                          data-testid="compare-draw"
                          className="font-mono text-[10px] text-muted-foreground"
                        >
                          {describeDraw(
                            row,
                            goal,
                            comparison,
                            profile.currency,
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <footer className="mt-16 flex justify-between border-t border-border pt-6 opacity-50">
          <p className="font-mono text-[10px] uppercase tracking-wider">
            Record persistent in local-cache
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wider">
            Affordo
          </p>
        </footer>
      </main>
    </div>
  );
}

/**
 * How a row's months read.
 *
 * `null` is **Unassigned**, and it is worded as being outside the plan rather
 * than as taking forever — the goal draws nothing and delays nobody, so "never"
 * would be false in the direction that discourages (ADR 0010, ADR 0024).
 */
/**
 * `months` is null for two different reasons and they must not read the same.
 *
 * **Unassigned** is a choice the user has not made yet — the goal is outside
 * the plan and nothing is wrong. **Unreachable** is the plan's answer: the goal
 * is in it, and there is no monthly money to fund it (#158). Collapsing both
 * into "not assigned" would tell a user who assigned a Share that they had not.
 */
function describeMonths(
  row: ComparisonRow | undefined,
  goalPrice: number,
  comparison: Comparison,
  currency: Parameters<typeof formatNumber>[1],
): string {
  const months = row?.months ?? null;
  const unassigned = row?.share === null || row?.share === undefined;

  // Funded at month zero means this goal's own cut of savings covered it, so
  // naming savings as the source is simply what happened. "Funded now" said
  // *when* and not *where from*, and where from is the interesting part (#170).
  if (months === 0) return "Funded through savings";

  if (months === null) {
    // An Unassigned goal draws no cut of the pot, so the plan can never fund
    // it. It can still be a goal the user's savings would cover on their own,
    // which is exactly what a zero solo baseline means — a weaker claim than
    // the one above, and worth making rather than withholding.
    //
    // The weaker claim can be true of several goals at once: three unassigned
    // €5,000 goals against €5,000 saved all say this, and buying any one
    // empties the pot. That is the limitation ADR 0024 already records for
    // /goals, and it reaches only goals OUTSIDE the plan — goals in it keep the
    // strict test above and cannot double-count.
    // Measured against what SURVIVES the plan, not against the whole balance.
    // #172 added a tile that states the plan has spent the pot; measuring the
    // weaker claim against `savings` let one screen say "Savings left €0" and
    // "would take €5,000 of savings" at the same time, about the same money.
    //
    // ADR 0024's known limitation covers unassigned goals double-counting
    // against EACH OTHER. It does not cover contradicting a figure this screen
    // computes and displays three lines higher.
    if (unassigned && goalPrice <= comparison.savingsLeft) {
      return "Funded through savings";
    }
    return unassigned ? "— not assigned" : "— unreachable";
  }

  return `${formatNumber(months, currency)} months`;
}

/**
 * The Delay line — the number the whole feature exists to produce.
 *
 * Silent in three cases, each for its own reason rather than to tidy the row:
 * `null` is an Unassigned goal or one unreachable even alone, so there is no
 * baseline to be late against; and exactly zero is a goal commanding the whole
 * Monthly Disposable, which is not delayed and should not be told it is by a
 * line reading "+0".
 *
 * A negative Delay can only happen on an Overdrawn plan — a goal cannot really
 * arrive sooner than it would alone. It is worded plainly rather than hidden,
 * because the alternative is a screen that goes quiet in the one state the user
 * most needs explaining. #158 adds the warning that says why.
 */
function describeDelay(
  delay: number | null,
  currency: Parameters<typeof formatNumber>[1],
): string | null {
  if (delay === null) return null;
  // Suppressed on what would be DISPLAYED, not on what was computed.
  //
  // Testing `delay === 0` looks equivalent and is not. A Share exactly equal to
  // the disposable does give exactly zero — the two expressions reduce to the
  // same arithmetic — but a Share a hair under it gives ~6e-11, which is not
  // zero and renders as "+0 months vs. alone": a goal being told it is late by
  // nothing. `formatNumber` defaults to one fraction digit, so 0.05 is the
  // threshold below which the sentence stops carrying information.
  if (Math.abs(delay) < 0.05) return null;
  if (delay < 0) {
    return `${formatNumber(-delay, currency)} months sooner than alone`;
  }
  return `+${formatNumber(delay, currency)} months vs. alone`;
}

/**
 * What this goal takes out of savings (#172).
 *
 * The tense is the whole point, and it differs because the two cases are
 * genuinely different:
 *
 * - A goal **in the plan** has an opening balance. That money is spoken for, so
 *   it **takes**.
 * - A goal **outside the plan** draws nothing at all. It can still be one
 *   savings would cover on its own (#170), and there the honest word is
 *   **would take** — it is a statement about what the user could do, not about
 *   what the plan has done.
 *
 * Saying "takes" of the second would be false, and "€0 from savings" would be
 * worse than silence. This is also where the weaker claim's cost becomes
 * legible: three unassigned goals each saying they would take the same €5,000
 * is the double-count on screen rather than buried in an ADR.
 */
function describeDraw(
  row: ComparisonRow | undefined,
  goal: Goal,
  comparison: Comparison,
  currency: Parameters<typeof formatNumber>[1],
): string | null {
  if (!row) return null;
  const unassigned = row.share === null;

  if (!unassigned) {
    if (row.openingBalance <= 0) return null;
    return `${formatMoney(row.openingBalance, currency)} from savings`;
  }

  // Outside the plan: only worth saying where the savings the plan has NOT
  // spent would in fact cover it — the same test `describeMonths` uses, so the
  // two lines cannot disagree about the same goal.
  if (goal.price > comparison.savingsLeft) return null;
  // The assigned branch above guards this; the unassigned one was written
  // without it. A free goal read "would take 0,00 € of savings", and the
  // docblock's own rule is that a zero here is worse than silence.
  if (goal.price <= 0) return null;
  return `would take ${formatMoney(goal.price, currency)} of savings`;
}
