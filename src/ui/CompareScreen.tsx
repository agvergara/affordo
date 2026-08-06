import { useState } from "react";
import { compare } from "../engine";
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
            className="mt-6 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2"
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
          </div>
        </section>

        <div className="mb-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <span
            data-testid="compare-divider"
            className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
          >
            Sharing · {goals.length}
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

                    <p
                      data-testid="compare-months"
                      className="ml-auto font-mono text-xs"
                    >
                      {describeMonths(row?.months ?? null, profile.currency)}
                    </p>
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
function describeMonths(
  months: number | null,
  currency: Parameters<typeof formatNumber>[1],
): string {
  if (months === null) return "— not assigned";
  if (months === 0) return "Funded now";
  return `${formatNumber(months, currency)} months`;
}
