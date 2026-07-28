import { useState } from "react";
import { evaluateReference } from "../engine";
import { useAffordo } from "../state/AffordoProvider";
import { AppHeader } from "./AppHeader";
import { GoalDialog } from "./GoalDialog";
import { formatMoney } from "./localeFormat";

/**
 * The `/goals` dashboard scaffold and profile snapshot (docs/affordo-context.md
 * §2/§4/§5). This slice builds the chrome only — the sticky header, the big
 * `Goals` title with its `Affordo` eyebrow, and a three-cell snapshot of figures
 * derived from the profile. The saved-goals list and add/edit/remove machinery
 * land in later slices.
 *
 * The three figures, all in the profile currency:
 * - **Time value** per hour — the Net Hourly Wage, taken from the reference
 *   engine with a price-0 goal exactly as `AppHeader` does.
 * - **Monthly surplus** — `salary − expenses + monthlyContribution`.
 * - **Threshold** — the significance threshold as a percentage.
 *
 * Mounted behind the `/goals` profile guard in `Router`, so `profile` here is
 * always a real profile (`salary > 0`).
 */
export function GoalsDashboard() {
  const { profile, goals, setGoals } = useAffordo();
  const [adding, setAdding] = useState(false);

  const hourly = evaluateReference(profile, { price: 0 }).hourlyRate;
  const surplus =
    profile.salary - profile.expenses + profile.monthlyContribution;

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <header>
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Affordo
          </p>
          <h1 className="mt-2 font-display text-6xl uppercase leading-none tracking-tight sm:text-8xl">
            Goals
          </h1>
        </header>

        <section
          data-testid="snapshot"
          className="mt-10 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3"
        >
          <div data-testid="snapshot-time-value" className="bg-background p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Time value
            </p>
            <p className="mt-1 text-xl font-bold tracking-tight">
              {formatMoney(hourly, profile.currency)}{" "}
              <span className="font-mono text-xs font-normal text-muted-foreground">
                / hour
              </span>
            </p>
          </div>

          <div data-testid="snapshot-surplus" className="bg-background p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Monthly surplus
            </p>
            <p className="mt-1 text-xl font-bold tracking-tight">
              {formatMoney(surplus, profile.currency)}
            </p>
          </div>

          <div data-testid="snapshot-threshold" className="bg-background p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Significance threshold
            </p>
            <p className="mt-1 text-xl font-bold tracking-tight">
              {profile.threshold}%
            </p>
          </div>
        </section>

        <div className="mt-12 flex items-center justify-between gap-4">
          <div
            data-testid="saved-goals-divider"
            className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            Saved goals · {goals.length}
          </div>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-none bg-foreground px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-background hover:bg-accent hover:text-accent-foreground"
          >
            Add goal
          </button>
        </div>

        {goals.length === 0 && (
          <div
            data-testid="goals-empty"
            className="mt-6 border border-dashed border-border p-10 text-center"
          >
            <p className="font-display text-2xl uppercase tracking-tight">
              No decisions to reckon with yet.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add your first goal to see what it costs in hours of your life.
            </p>
          </div>
        )}

        {goals.length > 0 && (
          <ul data-testid="goals-list" className="mt-6 space-y-4">
            {goals.map((goal) => (
              <li
                key={goal.id}
                data-testid="goal-item"
                className="flex items-baseline justify-between gap-4 border border-border bg-card p-4"
              >
                <span className="min-w-0 truncate font-display text-2xl uppercase tracking-tight">
                  {goal.name}
                </span>
                <span className="font-mono text-sm text-muted-foreground">
                  {formatMoney(goal.price, profile.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* New goals are prepended, so the most recent sits on top (dossier §8). */}
      <GoalDialog
        open={adding}
        onOpenChange={setAdding}
        onSave={(goal) => setGoals([goal, ...goals])}
      />
    </div>
  );
}
