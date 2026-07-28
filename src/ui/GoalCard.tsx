import type { Goal } from "../state/goals-store";

/**
 * A saved Goal weighed against the profile (docs/affordo-context.md §5).
 *
 * This slice builds the card's core (#60): the creation date, the goal name and
 * its optional note, the verdict badge, the price, and what the price costs in
 * days — or hours — of work. The threshold meter (#61), the stat block and
 * per-verdict explainers (#62), and the Edit/Remove actions land in later
 * slices, so the props stay `{ goal }` until those callbacks are needed.
 *
 * The date is `toLocaleDateString("en-US")` regardless of the profile currency —
 * a reference quirk reproduced deliberately (dossier §13).
 */
export function GoalCard({ goal }: { goal: Goal }) {
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
        </div>
      </div>
    </article>
  );
}
