import { useMemo } from "react";
import { evaluate } from "@/lib/affordability";
import { useAffordo } from "@/lib/affordo-context";
import { formatMoney, formatNumber } from "@/lib/format";
import type { Goal } from "@/lib/affordo-types";
import { VerdictBadge } from "./VerdictBadge";
import { Button } from "@/components/ui/button";

type Props = {
  goal: Goal;
  onEdit: () => void;
  onRemove: () => void;
};

export function GoalCard({ goal, onEdit, onRemove }: Props) {
  const { profile, t } = useAffordo();
  const v = useMemo(() => evaluate(profile, goal), [profile, goal]);
  const fmt = (n: number) => formatMoney(n, profile.currency);
  const num = (n: number, d = 1) => formatNumber(n, profile.currency, d);

  const showDays = v.daysOfWork >= 1;
  const workLabel = showDays
    ? `${num(v.daysOfWork)} ${t("daysOfWork")}`
    : `${num(v.hoursOfWork)} ${t("hoursOfWork")}`;

  const pctForBar = Math.min(100, (v.pctOfMonthlyIncome / (profile.threshold * 2)) * 100);

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
          {goal.note ? (
            <p className="mt-1 text-sm text-muted-foreground">{goal.note}</p>
          ) : null}
        </div>
        <VerdictBadge kind={v.kind} />
      </div>

      <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <span className="font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl">
          {fmt(goal.price)}
        </span>
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {workLabel}
        </span>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-wider">
          <span className="text-muted-foreground">
            {num(v.pctOfMonthlyIncome, 1)}% {t("pctOfIncome")}
          </span>
          <span className={v.aboveThreshold ? "text-accent" : "text-muted-foreground"}>
            {t("threshold")}: {profile.threshold}%
          </span>
        </div>
        <div className="relative h-2 w-full bg-black/5 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
          <div
            className="animate-scale-in-x h-full bg-foreground"
            style={{ width: `${pctForBar}%` }}
          />
          <div
            className="absolute top-0 h-full w-px bg-accent"
            style={{ left: `${Math.min(100, 50)}%` }}
            aria-hidden
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2">
        <div className="bg-background p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("timeToSave")}
          </p>
          <p className="mt-1 text-xl font-bold tracking-tight">
            {v.kind === "afford"
              ? "—"
              : v.monthsToSave != null
                ? `${num(v.monthsToSave, 1)} ${t("months")}`
                : v.cutMonths
                  ? `${v.cutMonths} ${t("months")} *`
                  : "∞"}
          </p>
        </div>
        <div className="bg-background p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("disposable")}
          </p>
          <p className="mt-1 text-xl font-bold tracking-tight">{fmt(v.monthlyDisposable)}</p>
        </div>
      </div>

      {v.kind === "cutToAfford" && v.cutPct != null ? (
        <p className="mt-4 border-l-2 border-accent bg-accent/5 p-3 text-sm">
          {t("cutExpenses")} <b>{num(v.cutPct, 1)}%</b> {t("toReachIn")} <b>{v.cutMonths} {t("months")}</b>.
        </p>
      ) : null}
      {v.kind === "cannot" ? (
        <p className="mt-4 border-l-2 border-destructive bg-destructive/5 p-3 text-sm">
          {t("aboveBudget")}
        </p>
      ) : null}
      {v.kind === "afford" ? (
        <p className="mt-4 border-l-2 border-emerald-600 bg-emerald-600/5 p-3 text-sm">
          {t("payItOff")}
        </p>
      ) : null}

      <div className="mt-6 flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="font-mono text-[10px] font-bold uppercase tracking-widest"
        >
          {t("edit")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="font-mono text-[10px] font-bold uppercase tracking-widest text-destructive hover:text-destructive"
        >
          {t("remove")}
        </Button>
      </div>
    </article>
  );
}
