import { useMemo } from "react";
import { evaluateReference } from "../engine";
import { useAffordo } from "../state/AffordoProvider";
import type { Goal } from "../state/goals-store";
import { formatMoney, formatNumber } from "./localeFormat";
import { VerdictBadge } from "./VerdictBadge";

/**
 * A saved Goal weighed against the profile (docs/affordo-context.md §5).
 *
 * The card's core (#60) is the creation date, the goal name and its optional
 * note, the verdict badge, the price, and what the price costs in days — or
 * hours — of work. On top of that sits the threshold meter (#61): the caption
 * row, a fill bar scaled to be full at twice the threshold, and a fixed
 * midpoint marker. The stat block and per-verdict explainers (#62) and the
 * Edit/Remove actions (#65) land in later slices, so the props stay `{ goal }`
 * until those callbacks are needed.
 *
 * The date is `toLocaleDateString("en-US")` regardless of the profile currency —
 * a reference quirk reproduced deliberately (dossier §13).
 */
export function GoalCard({ goal }: { goal: Goal }) {
  const { profile } = useAffordo();
  const verdict = useMemo(
    () => evaluateReference(profile, goal),
    [profile, goal],
  );

  // The meter is scaled so the track is full at TWICE the threshold, which puts
  // the threshold itself on the midpoint (dossier §8).
  const pctForBar = Math.min(
    100,
    (verdict.pctOfMonthlyIncome / (profile.threshold * 2)) * 100,
  );

  // Days once the price costs a full work day, hours below that (dossier §8).
  const showDays = verdict.daysOfWork >= 1;
  const workLabel = showDays
    ? `${formatNumber(verdict.daysOfWork, profile.currency)} days of work`
    : `${formatNumber(verdict.hoursOfWork, profile.currency)} hours of work`;

  return (
    <article className="border border-border bg-card p-6 sm:p-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {new Date(goal.createdAt).toLocaleDateString("en-US")}
          </p>
          <h2 className="mt-1 truncate font-display text-3xl uppercase tracking-tight sm:text-4xl">
            {goal.name}
          </h2>
          {goal.note && (
            <p
              data-testid="goal-note"
              className="mt-1 text-sm text-muted-foreground"
            >
              {goal.note}
            </p>
          )}
        </div>
        <VerdictBadge kind={verdict.kind} />
      </div>

      <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <span className="font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl">
          {formatMoney(goal.price, profile.currency)}
        </span>
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {workLabel}
        </span>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-wider">
          <span className="text-muted-foreground">
            {formatNumber(verdict.pctOfMonthlyIncome, profile.currency, 1)}% of
            monthly income
          </span>
          <span
            className={
              verdict.aboveThreshold ? "text-accent" : "text-muted-foreground"
            }
          >
            Significance threshold: {profile.threshold}%
          </span>
        </div>

        <div className="relative h-2 w-full bg-black/5 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
          <div
            data-testid="threshold-fill"
            className="animate-scale-in-x h-full bg-foreground"
            style={{ width: `${pctForBar}%` }}
          />
          {/*
            Hard-coded to the track's midpoint, exactly as the reference writes
            it (`Math.min(100, 50)`). It marks where the threshold sits under
            the twice-threshold scale, but it does NOT track the threshold — a
            reference quirk reproduced on purpose (dossier §13, question 5).
          */}
          <div
            data-testid="threshold-marker"
            className="absolute top-0 h-full w-px bg-accent"
            style={{ left: `${Math.min(100, 50)}%` }}
            aria-hidden
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2">
        <div className="bg-background p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Time to save
          </p>
        </div>
        <div className="bg-background p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Monthly surplus
          </p>
        </div>
      </div>
    </article>
  );
}
