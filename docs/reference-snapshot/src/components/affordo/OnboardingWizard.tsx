import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAffordo } from "@/lib/affordo-context";
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
import type { Currency, Profile } from "@/lib/affordo-types";
import { defaultProfile } from "@/lib/affordo-types";

type FieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
  id: string;
};

function Field({ label, hint, children, id }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const bigInputClass =
  "w-full border-0 border-b-2 border-border bg-transparent px-0 py-2 text-3xl font-bold outline-none transition-colors focus-visible:border-accent focus-visible:ring-0 rounded-none shadow-none";

export function OnboardingWizard() {
  const { profile, setProfile, t } = useAffordo();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Profile>(profile.salary > 0 ? profile : defaultProfile);
  const [step, setStep] = useState(0);
  const steps = [t("stepWelcomeLabel"), t("stepIncomeLabel"), t("stepExpensesLabel"), t("stepRulesLabel")];

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const canContinue =
    step !== 1 || (draft.salary > 0 && draft.hoursPerWeek > 0 && draft.hoursPerDay > 0 && draft.paymentsPerYear > 0);

  function next() {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setProfile(draft);
      navigate({ to: "/goals" });
    }
  }

  function num(v: string) {
    const n = parseFloat(v.replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader showTimeValue={false} />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {t("onboardingTitle")}
            </p>
            <h1 className="mt-2 font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl">
              {steps[step]}
            </h1>
          </div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {String(step + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
          </span>
        </div>

        <div className="mb-10 flex gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 ${i <= step ? "bg-foreground" : "bg-border"}`}
              aria-hidden
            />
          ))}
        </div>

        <div key={step} className="animate-slide-up space-y-8">
          {step === 0 ? (
            <div className="space-y-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
                {t("welcomeKicker")}
              </p>
              <p className="font-display text-3xl uppercase leading-tight tracking-tight sm:text-4xl">
                {t("welcomeHeadline")}
              </p>
              <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
                {t("welcomeBody")}
              </p>
            </div>
          ) : null}

          {step === 1 ? (
            <>
              <Field id="currency" label={t("currency")}>
                <Select value={draft.currency} onValueChange={(v) => update("currency", v as Currency)}>
                  <SelectTrigger className={bigInputClass + " h-auto"}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR — €</SelectItem>
                    <SelectItem value="GBP">GBP — £</SelectItem>
                    <SelectItem value="USD">USD — $</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field id="salary" label={t("netMonthlySalary")}>
                <Input
                  id="salary"
                  type="number"
                  inputMode="decimal"
                  className={bigInputClass}
                  value={draft.salary || ""}
                  onChange={(e) => update("salary", num(e.target.value))}
                  placeholder="0"
                  autoFocus
                />
              </Field>
              <div className="grid gap-8 sm:grid-cols-2">
                <Field id="hoursPerWeek" label={t("hoursPerWeek")}>
                  <Input
                    id="hoursPerWeek"
                    type="number"
                    className={bigInputClass}
                    value={draft.hoursPerWeek || ""}
                    onChange={(e) => update("hoursPerWeek", num(e.target.value))}
                  />
                </Field>
                <Field id="hoursPerDay" label={t("hoursPerDay")}>
                  <Input
                    id="hoursPerDay"
                    type="number"
                    className={bigInputClass}
                    value={draft.hoursPerDay || ""}
                    onChange={(e) => update("hoursPerDay", num(e.target.value))}
                  />
                </Field>
              </div>
              <Field id="paymentsPerYear" label={t("paymentsPerYear")} hint={t("paymentsHint")}>
                <Input
                  id="paymentsPerYear"
                  type="number"
                  className={bigInputClass}
                  value={draft.paymentsPerYear || ""}
                  onChange={(e) => update("paymentsPerYear", num(e.target.value))}
                />
              </Field>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Field id="expenses" label={t("monthlyExpenses")} hint={t("expensesHint")}>
                <Input
                  id="expenses"
                  type="number"
                  inputMode="decimal"
                  className={bigInputClass}
                  value={draft.expenses || ""}
                  onChange={(e) => update("expenses", num(e.target.value))}
                  placeholder="0"
                  autoFocus
                />
              </Field>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Field id="threshold" label={`${t("threshold")} — ${draft.threshold}%`} hint={t("thresholdHint")}>
                <Slider
                  id="threshold"
                  min={1}
                  max={50}
                  step={1}
                  value={[draft.threshold]}
                  onValueChange={([v]) => update("threshold", v)}
                  className="pt-3"
                />
              </Field>
              <div className="grid gap-8 sm:grid-cols-2">
                <Field id="savings" label={t("currentSavings")}>
                  <Input
                    id="savings"
                    type="number"
                    className={bigInputClass}
                    value={draft.savings || ""}
                    onChange={(e) => update("savings", num(e.target.value))}
                    placeholder="0"
                  />
                </Field>
                <Field id="monthlyContribution" label={t("monthlyContribution")} hint={t("contributionHint")}>
                  <Input
                    id="monthlyContribution"
                    type="number"
                    className={bigInputClass}
                    value={draft.monthlyContribution || ""}
                    onChange={(e) => update("monthlyContribution", num(e.target.value))}
                    placeholder="0"
                  />
                </Field>
              </div>
            </>
          ) : null}
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="font-mono text-[11px] font-bold uppercase tracking-widest"
          >
            ← {t("back")}
          </Button>
          <Button
            type="button"
            onClick={next}
            disabled={!canContinue}
            className="rounded-none bg-foreground px-6 py-6 font-mono text-[11px] font-bold uppercase tracking-widest text-background hover:bg-accent hover:text-accent-foreground"
          >
            {step === 0 ? t("start") : step === steps.length - 1 ? t("finish") : t("continue")} →
          </Button>
        </div>
      </main>
    </div>
  );
}
