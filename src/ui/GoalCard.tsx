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
 * midpoint marker. Below that sits the stat block (#62) — `Time to save` and
 * `Monthly surplus` — and the one explainer paragraph the verdict earns. Last
 * comes the actions row (#65), which owns no goal state of its own: it reports
 * the user's intent upward and lets the dashboard hold the goal list.
 *
 * The date is `toLocaleDateString("en-US")` regardless of the profile currency —
 * a reference quirk reproduced deliberately (dossier §13).
 */
export interface GoalCardProps {
  goal: Goal;
  /** The user asked to revise this goal. */
  onEdit: () => void;
  /** The user asked to delete this goal. */
  onRemove: () => void;
}

/**
 * Shared ghost-button shape for the two actions (dossier §5, §12). The hover
 * TEXT colour is deliberately left off here and set per action below.
 *
 * The reference composes shadcn's ghost variant with each button's overrides
 * through `cn()`, whose tailwind-merge drops a base class the override
 * conflicts with. Remove's `hover:text-destructive` conflicts with ghost's
 * `hover:text-accent-foreground`, so the reference never emits the latter on
 * Remove — which is what "a destructive ghost pins its text colour" means.
 * Affordo has no tailwind-merge (ADR 0014, React-only), so emitting both would
 * leave the winner to Tailwind's stylesheet ordering rather than to the code.
 * Splitting the constant reproduces the merged result directly.
 */
const ACTION =
  "inline-flex h-8 cursor-pointer items-center justify-center rounded-md px-3 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-accent";

const EDIT_ACTION = `${ACTION} hover:text-accent-foreground`;
const REMOVE_ACTION = `${ACTION} text-destructive hover:text-destructive`;

export function GoalCard({ goal, onEdit, onRemove }: GoalCardProps) {
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

  // `Time to save` reads off the verdict kind: an already-afforded goal has no
  // horizon to state, so it shows an em dash; a stretch states the months the
  // surplus needs (dossier §5).
  const timeToSave =
    verdict.kind === "afford"
      ? "—"
      : verdict.monthsToSave !== null
        ? `${formatNumber(verdict.monthsToSave, profile.currency)} months`
        : verdict.cutMonths !== null
          ? // `cutMonths` is a literal 12 at src/engine/reference-evaluate.ts:75,90 — the only reason this locale formatting is untestable here and at the explainer site below; derive the horizon and both become live locale bugs with nothing pinning them.
            // The trailing `*` is the reference's own, and nothing on the card
            // explains it. Reproduced deliberately (dossier §13).
            `${formatNumber(verdict.cutMonths, profile.currency)} months *`
          : "∞";

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
          <p className="mt-1 text-xl font-bold tracking-tight">{timeToSave}</p>
        </div>
        <div className="bg-background p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Monthly surplus
          </p>
          <p className="mt-1 text-xl font-bold tracking-tight">
            {formatMoney(verdict.monthlyDisposable, profile.currency)}
          </p>
        </div>
      </div>

      {/*
        One explainer per verdict, in the reference's copy and order (dossier
        §5). `stretch` earns none: the months in the stat block are the whole
        answer for a goal the surplus already reaches.
      */}
      {verdict.kind === "cutToAfford" && (
        <p className="mt-4 border-l-2 border-accent bg-accent/5 p-3 text-sm">
          Cut expenses by{" "}
          <b>{formatNumber(verdict.cutPct ?? 0, profile.currency)}%</b> to reach
          it in{" "}
          <b>
            {formatNumber(verdict.cutMonths ?? 0, profile.currency)} months
          </b>
          .
        </p>
      )}

      {verdict.kind === "cannot" && (
        <p className="mt-4 border-l-2 border-destructive bg-destructive/5 p-3 text-sm">
          Beyond a reasonable savings plan.
        </p>
      )}

      {verdict.kind === "afford" && (
        <p className="mt-4 border-l-2 border-emerald-600 bg-emerald-600/5 p-3 text-sm">
          You already have savings for this.
        </p>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onEdit} className={EDIT_ACTION}>
          Edit
        </button>
        {/* A destructive ghost keeps its own text colour through hover, rather
            than inverting to the accent the way Edit does (dossier §12). */}
        <button type="button" onClick={onRemove} className={REMOVE_ACTION}>
          Remove
        </button>
      </div>
    </article>
  );
}
