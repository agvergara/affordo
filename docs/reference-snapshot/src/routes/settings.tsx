import { useState } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/affordo/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAffordo } from "@/lib/affordo-context";
import type { Currency, Profile } from "@/lib/affordo-types";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Affordo" },
      { name: "description", content: "Edit your financial profile and preferences." },
      { property: "og:title", content: "Settings · Affordo" },
      { property: "og:description", content: "Edit your financial profile and preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { hydrated, hasProfile, profile, setProfile, clearProfile, clearGoals, t } = useAffordo();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Profile>(profile);

  if (!hydrated) return null;
  if (!hasProfile) return <Navigate to="/onboarding" />;

  function upd<K extends keyof Profile>(k: K, v: Profile[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }
  function num(v: string) {
    const n = parseFloat(v.replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function save() {
    setProfile(draft);
    toast.success(t("save"));
  }

  function reset() {
    if (typeof window !== "undefined" && !window.confirm(t("resetConfirm"))) return;
    clearProfile();
    clearGoals();
    navigate({ to: "/onboarding" });
  }

  const bigInput =
    "w-full border-0 border-b-2 border-border bg-transparent px-0 py-2 text-2xl font-bold outline-none focus-visible:border-accent focus-visible:ring-0 rounded-none shadow-none";

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-10 border-t-4 border-foreground pt-6">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {t("brand")}
          </p>
          <h1 className="mt-2 font-display text-6xl uppercase leading-none tracking-tight">
            {t("settings")}
          </h1>
        </div>

        <div className="space-y-8">
          <div className="space-y-2">
            <Label className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("currency")}
            </Label>
            <Select value={draft.currency} onValueChange={(v) => upd("currency", v as Currency)}>
              <SelectTrigger className={bigInput + " h-auto"}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR — €</SelectItem>
                <SelectItem value="GBP">GBP — £</SelectItem>
                <SelectItem value="USD">USD — $</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("netMonthlySalary")}
            </Label>
            <Input type="number" className={bigInput} value={draft.salary || ""} onChange={(e) => upd("salary", num(e.target.value))} />
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {t("hoursPerWeek")}
              </Label>
              <Input type="number" className={bigInput} value={draft.hoursPerWeek || ""} onChange={(e) => upd("hoursPerWeek", num(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {t("hoursPerDay")}
              </Label>
              <Input type="number" className={bigInput} value={draft.hoursPerDay || ""} onChange={(e) => upd("hoursPerDay", num(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {t("paymentsPerYear")}
              </Label>
              <Input type="number" className={bigInput} value={draft.paymentsPerYear || ""} onChange={(e) => upd("paymentsPerYear", num(e.target.value))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("monthlyExpenses")}
            </Label>
            <Input type="number" className={bigInput} value={draft.expenses || ""} onChange={(e) => upd("expenses", num(e.target.value))} />
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {t("currentSavings")}
              </Label>
              <Input type="number" className={bigInput} value={draft.savings || ""} onChange={(e) => upd("savings", num(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {t("monthlyContribution")}
              </Label>
              <Input type="number" className={bigInput} value={draft.monthlyContribution || ""} onChange={(e) => upd("monthlyContribution", num(e.target.value))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("threshold")} — {draft.threshold}%
            </Label>
            <Slider min={1} max={50} step={1} value={[draft.threshold]} onValueChange={([v]) => upd("threshold", v)} className="pt-3" />
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
          <Button
            variant="ghost"
            onClick={reset}
            className="font-mono text-[10px] font-bold uppercase tracking-widest text-destructive hover:text-destructive"
          >
            {t("resetAll")}
          </Button>
          <Button
            onClick={save}
            className="rounded-none bg-foreground px-6 py-6 font-mono text-[11px] font-bold uppercase tracking-widest text-background hover:bg-accent hover:text-accent-foreground"
          >
            {t("save")}
          </Button>
        </div>
      </main>
    </div>
  );
}
