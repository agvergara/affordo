import { useState } from "react";
import { evaluateReference } from "../engine";
import { useAffordo } from "../state/AffordoProvider";
import type { Goal } from "../state/goals-store";
import { AppHeader } from "./AppHeader";
import { GoalCard } from "./GoalCard";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  // The Goal the dialog is revising, or null when it is adding a new one. This
  // is the only thing that distinguishes the two uses of the one dialog.
  const [editing, setEditing] = useState<Goal | null>(null);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setDialogOpen(true);
  };

  // Removal matches on id, never on the goal's contents: two goals may share a
  // name, a price and a date, and only the id tells them apart.
  const removeGoal = (goal: Goal) => {
    setGoals(goals.filter((g) => g.id !== goal.id));
  };

  // A new goal is prepended so the most recent sits on top (dossier §8); an
  // edited one is swapped in where it already sits, keeping the list's order.
  // The dialog hands back the original `id`, which is what makes the match.
  const saveGoal = (goal: Goal) => {
    setGoals(
      editing === null
        ? [goal, ...goals]
        : goals.map((g) => (g.id === goal.id ? goal : g)),
    );
  };

  const hourly = evaluateReference(profile, { price: 0 }).hourlyRate;
  const surplus =
    profile.salary - profile.expenses + profile.monthlyContribution;

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      {/*
        `py-10` with no `sm:py-16` — the reference's own (`goals.tsx:74`). The
        extra step was borrowed from the onboarding rhythm (§10) and is now
        load-bearing: with the footer inside `<main>`, this bottom padding *is*
        the footer's gap to the viewport, 40px in the reference against 64px for
        us at ≥640px.
      */}
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/*
          One section, opened by the 4px foreground rule, holding the eyebrow,
          the title and the snapshot grid (`goals.tsx:75`). Ours had a bare
          `<header>` beside a separate grid — the rule is the page's masthead
          and its absence flattened the opening (#127).
        */}
        <section
          data-testid="snapshot"
          className="mb-10 border-t-4 border-foreground pt-6"
        >
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Affordo
          </p>
          <h1 className="mt-2 font-display text-6xl uppercase leading-none tracking-tight sm:text-8xl">
            Goals
          </h1>

          <div
            data-testid="snapshot-grid"
            className="mt-6 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3"
          >
            <div
              data-testid="snapshot-time-value"
              className="bg-background p-4"
            >
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
          </div>
        </section>

        {/*
          Divider and add-button are two stacked blocks in the reference
          (`goals.tsx:108` and `:118`), not the one `justify-between` row we
          had, and the button sits right-aligned on its own below.

          The two `h-px flex-1` rules render 0px wide and leave the label
          left-aligned — an empty `flex-1` with no basis contributes nothing to
          max-content inside a shrink-to-fit flex child. The reference has the
          same quirk, so this reproduces markup rather than a visible divider.
          Giving them a width would be inventing a rule the reference does not
          draw.
        */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div data-testid="divider-rule" className="h-px flex-1 bg-border" />
            <span
              data-testid="saved-goals-divider"
              className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
            >
              Saved goals · {goals.length}
            </span>
            <div data-testid="divider-rule" className="h-px flex-1 bg-border" />
          </div>
        </div>

        {/*
          `h-9` is the load-bearing class here, and it is why copying the
          reference's `className` alone is not fidelity. The reference renders a
          shadcn `<Button>` whose default size is `h-9 px-4 py-2`; `cn()` merges
          `px-5 py-5` over the padding but *keeps* `h-9`, since height and
          padding are separate conflict groups in tailwind-merge. So the
          reference button is 36px tall and its `py-5` never grows it.

          Ours is a bare `<button>` with no base layer, so the same string
          rendered at 58.5px — the class string got closer to the reference
          while the pixels moved further from it (#134's duel). The surviving
          base classes are inlined, exactly as `GoalDialog` already does for
          shadcn's `Input`.

          `border-0` is the other half. `theme.css`'s base layer still carries
          the pre-parity app's global `button` rule, which puts `1px solid` on
          every button here; the reference's base layer has no `button` rule at
          all (`styles.css:111` is three rules). That is a systemic divergence
          affecting every screen, so it is filed separately rather than fixed
          from inside a `/goals` PR — this neutralises it for one button.

          Measured in Chromium: reference and ours both **40px**. Not 36px —
          `h-9` is 36, but border-box clamps height up to padding, and `py-5`
          (20px each side) survives the merge over the size variant's `py-2`.
          `h-9 px-4 py-2` is 36px; `h-9 px-5 py-5` is 40px.
        */}
        <div className="mb-8 flex justify-end">
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-9 cursor-pointer items-center border-0 justify-center gap-2 whitespace-nowrap rounded-none bg-foreground px-5 py-5 font-mono text-[11px] font-bold uppercase tracking-widest text-background shadow transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&_svg]:size-4 [&_svg]:shrink-0"
          >
            <PlusIcon />
            Add goal
          </button>
        </div>

        {goals.length === 0 && (
          <div
            data-testid="goals-empty"
            className="border-2 border-dashed border-border p-12 text-center"
          >
            <p className="font-display text-3xl uppercase tracking-tight">
              No decisions to reckon with yet.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add your first goal to see what it costs in hours of your life.
            </p>
          </div>
        )}

        {goals.length > 0 && (
          <ul data-testid="goals-list" className="space-y-5">
            {goals.map((goal) => (
              <li key={goal.id} data-testid="goal-item">
                <GoalCard
                  goal={goal}
                  onEdit={() => openEdit(goal)}
                  onRemove={() => removeGoal(goal)}
                />
              </li>
            ))}
          </ul>
        )}

        {/*
         * Dashboard footer (reference `src/routes/goals.tsx:146-149`, read off
         * the reference app to close #104 — the dossier had no teardown for it).
         *
         * `opacity-50` is the reference's own. #102's duel concluded it was an
         * invention and I conceded; the extraction shows the reference dims this
         * footer and the dossier was simply incomplete. Dimming lives here rather
         * than on a `text-muted-foreground`, which is why the children carry no
         * colour of their own.
         *
         * Inside `<main>`, not after it, so `mt-16 border-t pt-6` separates it
         * from the content above rather than from the viewport edge.
         */}
        <footer className="mt-16 flex justify-between border-t border-border pt-6 opacity-50">
          <p className="font-mono text-[10px] uppercase tracking-wider">
            Record persistent in local-cache
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wider">
            Affordo
          </p>
        </footer>
      </main>

      {/* One dialog for both jobs: `initial` decides add vs edit (dossier §5). */}
      <GoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSave={saveGoal}
      />
    </div>
  );
}

/**
 * The add-button's leading glyph — `lucide-react`'s `Plus` at `size-4`
 * (`goals.tsx:126`). Inlined at lucide's own geometry rather than taking the
 * dependency for one icon, exactly as `AppHeader` does for the theme toggle.
 * `aria-hidden` because the button already reads "Add goal": announcing the
 * glyph would say it twice.
 */
function PlusIcon() {
  return (
    <svg
      data-testid="add-goal-plus"
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
