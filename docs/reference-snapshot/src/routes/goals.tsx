import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/affordo/AppHeader";
import { GoalCard } from "@/components/affordo/GoalCard";
import { GoalDialog } from "@/components/affordo/GoalDialog";
import { Button } from "@/components/ui/button";
import { useAffordo } from "@/lib/affordo-context";
import type { Goal } from "@/lib/affordo-types";
import { formatMoney } from "@/lib/format";
import { evaluate } from "@/lib/affordability";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/goals")({
  head: () => ({
    meta: [
      { title: "Goals · Affordo" },
      { name: "description", content: "See every purchase weighed against your working hours." },
      { property: "og:title", content: "Goals · Affordo" },
      { property: "og:description", content: "See every purchase weighed against your working hours." },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const { hydrated, hasProfile, profile, goals, setGoals, t } = useAffordo();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">loading…</p>
      </div>
    );
  }
  if (!hasProfile) return <Navigate to="/onboarding" />;

  const hourly = evaluate(profile, { id: "_", name: "_", price: 0, note: "", createdAt: 0 }).hourlyRate;
  const disposable = profile.salary - profile.expenses + profile.monthlyContribution;

  function handleSave(goal: Goal) {
    setGoals((prev) => {
      const idx = prev.findIndex((g) => g.id === goal.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = goal;
        return copy;
      }
      return [goal, ...prev];
    });
    setEditing(null);
  }

  function handleAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleEdit(goal: Goal) {
    setEditing(goal);
    setDialogOpen(true);
  }

  function handleRemove(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  const fmt = (n: number) => formatMoney(n, profile.currency);

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Snapshot */}
        <section className="mb-10 border-t-4 border-foreground pt-6">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {t("brand")}
          </p>
          <h1 className="mt-2 font-display text-6xl uppercase leading-none tracking-tight sm:text-8xl">
            {t("goalsTitle")}
          </h1>
          <div className="mt-6 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
            <div className="bg-background p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("hourlyRate")}
              </p>
              <p className="mt-1 text-xl font-bold tracking-tight">
                {fmt(hourly)} <span className="font-mono text-xs font-normal text-muted-foreground">{t("perHour")}</span>
              </p>
            </div>
            <div className="bg-background p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("disposable")}
              </p>
              <p className="mt-1 text-xl font-bold tracking-tight">{fmt(disposable)}</p>
            </div>
            <div className="bg-background p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("threshold")}
              </p>
              <p className="mt-1 text-xl font-bold tracking-tight">{profile.threshold}%</p>
            </div>
          </div>
        </section>

        {/* Add button */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {t("savedGoals")} · {goals.length}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>

        <div className="mb-8 flex justify-end">
          <Button
            onClick={handleAdd}
            className="gap-2 rounded-none bg-foreground px-5 py-5 font-mono text-[11px] font-bold uppercase tracking-widest text-background hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="size-4" />
            {t("addGoal")}
          </Button>
        </div>

        {goals.length === 0 ? (
          <div className="border-2 border-dashed border-border p-12 text-center">
            <p className="font-display text-3xl uppercase tracking-tight">{t("empty")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("emptyHint")}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {goals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onEdit={() => handleEdit(g)}
                onRemove={() => handleRemove(g.id)}
              />
            ))}
          </div>
        )}

        <footer className="mt-16 flex justify-between border-t border-border pt-6 opacity-50">
          <p className="font-mono text-[10px] uppercase tracking-wider">{t("footerLocal")}</p>
          <p className="font-mono text-[10px] uppercase tracking-wider">Affordo</p>
        </footer>
      </main>

      <GoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSave={handleSave}
      />
    </div>
  );
}
