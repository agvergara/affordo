import type { Settings, Verdict } from "../engine";
import { formatMoney, formatVerdict } from "./format";
import type { Goal } from "./goals";

/** Verdict tone for a saved goal's snapshot — the same no-red palette as the
 *  live VerdictCard (ADR 0010). Save-Up stays neutral. */
const TONE: Record<Verdict["kind"], string> = {
  "affordable-now": "text-positive",
  "save-up": "text-stone",
  "not-reachable": "text-constructive",
};

export interface SavedGoalsProps {
  goals: Goal[];
  currency: Settings["currency"];
  /** Called with the goal's price in cents so the caller can repopulate Price. */
  onReopen: (priceCents: number) => void;
  onRemove: (id: string) => void;
}

/** The list of Saved Goals, each retaining its snapshotted Verdict.
 *  Presentational — the caller owns the goals and the reopen/remove actions. */
export function SavedGoals({
  goals,
  currency,
  onReopen,
  onRemove,
}: SavedGoalsProps) {
  if (goals.length === 0) return null;
  return (
    <section data-testid="goals" className="mt-10 border-t border-border pt-6">
      <h2 className="font-display text-xl">Saved goals</h2>
      <ul className="mt-3 space-y-2">
        {goals.map((goal) => (
          <li
            key={goal.id}
            data-verdict={goal.verdict.kind}
            className="rounded-xl border border-border bg-card p-3"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-medium">{goal.name}</span>
              <span className="text-stone">
                {formatMoney(goal.price, currency)}
              </span>
              <span className="ml-auto flex gap-2">
                <button type="button" onClick={() => onReopen(goal.price)}>
                  Reopen
                </button>
                <button type="button" onClick={() => onRemove(goal.id)}>
                  Remove goal
                </button>
              </span>
            </div>
            <p className={`mt-1 text-sm ${TONE[goal.verdict.kind]}`}>
              {formatVerdict(goal.verdict, currency)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
