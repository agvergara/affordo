import { useState, type ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { useAffordo } from "../state/AffordoProvider";
import { defaultProfile, type Profile } from "../state/profile-store";
import type { Currency } from "../engine/reference-types";

/**
 * `num(v)` (dossier §7): parse a field string with a comma-or-dot decimal
 * separator, falling back to 0 on NaN. Matches the reference's onboarding
 * helper — it accepts a decimal comma but not thousands separators, and that
 * naivety is reproduced rather than fixed (PRD #39, formatting quirks).
 */
function num(v: string): number {
  const parsed = parseFloat(v.replace(",", "."));
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * How the wizard leaves for the next screen. Mirrors `Router`'s `Navigate`
 * (`(to: string) => void`): the client-only SPA (ADR 0004/0009) has no history
 * router, so a redirect is a real location change; tests inject a spy instead.
 */
export type Navigate = (to: string) => void;

const defaultNavigate: Navigate = (to) => window.location.replace(to);

/**
 * The onboarding wizard (docs/affordo-context.md §15/§16). Shell chrome from
 * #51, draft plumbing and the finish action from #53, then the four step
 * bodies: Welcome (#54), Income and its gate (#55), Expenses (#56) and
 * Rules (#57). Income is the only step that gates.
 *
 * The draft is seeded once, at mount, from the profile the provider holds. To
 * keep that seed from capturing the pre-hydration default (the provider renders
 * `defaultProfile` until its post-mount effect reads storage, §8), the body is
 * gated on `hydrated` and keyed on it, so it mounts — and seeds — only once the
 * real profile is in hand (the same pattern as SettingsScreen).
 */
export function OnboardingWizard({
  navigate = defaultNavigate,
}: {
  navigate?: Navigate;
} = {}) {
  const { profile, hydrated } = useAffordo();
  if (!hydrated) return null;
  return <WizardBody key="hydrated" profile={profile} navigate={navigate} />;
}

/** The four step headings, indexed by `step`. */
const steps = ["Welcome", "Income", "Expenses", "Rules"] as const;

function WizardBody({
  profile,
  navigate,
}: {
  profile: Profile;
  navigate: Navigate;
}) {
  const { setProfile } = useAffordo();
  const [step, setStep] = useState(0);

  // The draft is a full Profile edited in place across steps, seeded from the
  // stored profile when the user has one (salary > 0) else from defaults (§15).
  // Local state only — nothing is persisted until finish.
  const [draft, setDraft] = useState<Profile>(
    profile.salary > 0 ? profile : defaultProfile,
  );

  /** Edit one field of the draft in place. */
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  // §15: Income is the only gating step. Every other step advances freely —
  // expenses and the rules figures are all optional-but-encouraged. The gate is
  // deliberately quiet: the control simply stays disabled, with no error text
  // (PRD story 22).
  const canContinue =
    step !== 1 ||
    (draft.salary > 0 &&
      draft.hoursPerWeek > 0 &&
      draft.hoursPerDay > 0 &&
      draft.paymentsPerYear > 0);

  // Advance: on the last step, persist the draft and leave for /goals (§15);
  // otherwise step forward. Nothing is written or navigated before finish.
  const next = () => {
    if (isLast) {
      setProfile(draft);
      navigate("/goals");
    } else {
      setStep((s) => Math.min(steps.length - 1, s + 1));
    }
  };

  // Verbatim label rule (§16): Start on step 0, Finish setup on the last step,
  // Continue otherwise — always suffixed with " →".
  const primaryLabel =
    (isFirst ? "Start" : isLast ? "Finish setup" : "Continue") + " →";

  const counter =
    String(step + 1).padStart(2, "0") +
    " / " +
    String(steps.length).padStart(2, "0");

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader showTimeValue={false} />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
        <div
          data-testid="step-head"
          className="mb-8 flex items-end justify-between gap-4"
        >
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Set up your reckoning
            </p>
            <h1 className="mt-2 font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl">
              {steps[step]}
            </h1>
          </div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {counter}
          </span>
        </div>

        <div
          className="mb-10 flex gap-1.5"
          data-testid="progress-bar"
          aria-hidden
        >
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 ${i <= step ? "bg-foreground" : "bg-border"}`}
            />
          ))}
        </div>

        {/*
          Keyed on `step` so each step body is a *new* element on every change:
          that remount is what re-runs `animate-slide-up` (§17). The chrome above
          and below sits outside this div and keeps its identity, so it never
          re-animates.
        */}
        <div
          key={step}
          data-testid="step-body"
          className="animate-slide-up space-y-8"
        >
          {step === 0 && <WelcomeStep />}
          {step === 1 && <IncomeStep draft={draft} set={set} />}
          {step === 2 && <ExpensesStep draft={draft} set={set} />}
          {step === 3 && <RulesStep draft={draft} set={set} />}
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            /*
             * The reference's Back is `variant="ghost"` with a className of
             * only `font-mono text-[11px] font-bold uppercase tracking-widest`
             * — no colour. So it inherits `--foreground` and takes its hover
             * from the ghost variant, and the base gives it `h-9 px-4 py-2
             * rounded-md`.
             *
             * Ours had `p-0` (no hit area beyond the text) and painted it
             * `text-muted-foreground hover:text-foreground`, which inverts the
             * pair: the reference's Back is the stronger state at rest and
             * gains a filled accent box on hover, not the other way round.
             */
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {"← Back"}
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!canContinue}
            /*
             * `h-9` and `shadow` come from the reference's `<Button>` base and
             * default variant. Without `h-9` this rendered 65px against the
             * reference's 48px — `py-6` gives 24px a side and border-box clamps
             * height up to the padding, so `h-9` loses on height but the box is
             * still the reference's (#139).
             */
            className="inline-flex h-9 cursor-pointer items-center justify-center whitespace-nowrap rounded-none bg-foreground px-6 py-6 font-mono text-[11px] font-bold uppercase tracking-widest text-background shadow transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none"
          >
            {primaryLabel}
          </button>
        </div>
      </main>
    </div>
  );
}

/**
 * Step 0 — Welcome (dossier §16 "STEP 0"). No fields: three stacked text
 * blocks, and the primary control is enabled because this step gates nothing.
 *
 * The headline and body are `<p>`, not headings. That is the reference's own
 * structure (§11 records the onboarding headline and welcome body as
 * paragraphs) and is reproduced rather than corrected, per PRD #39's fidelity
 * bar — so nothing here is addressable by heading role.
 */
function WelcomeStep() {
  return (
    <div className="space-y-6">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
        Before you buy
      </p>
      <p className="font-display text-3xl uppercase leading-tight tracking-tight sm:text-4xl">
        Measure any purchase in hours of your life.
      </p>
      <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
        Affordo turns your salary into a time budget, then weighs every goal
        against it. Set your income once, then add a goal any time you&apos;re
        tempted to spend.
      </p>
    </div>
  );
}

/** The currency options, in the dossier's order, with their symbols (§16). */
const CURRENCY_OPTIONS: ReadonlyArray<{ value: Currency; label: string }> = [
  { value: "EUR", label: "EUR — €" },
  { value: "GBP", label: "GBP — £" },
  { value: "USD", label: "USD — $" },
];

/**
 * Step 1 — Income (dossier §16 "STEP 1"). The only step that gates: the
 * primary control stays disabled until all four numeric fields exceed zero
 * (see `canContinue` in `WizardBody`).
 */
function IncomeStep({
  draft,
  set,
}: {
  draft: Profile;
  set: <K extends keyof Profile>(key: K, value: Profile[K]) => void;
}) {
  return (
    <>
      <Field id="onboarding-currency" label="Currency">
        <select
          id="onboarding-currency"
          value={draft.currency}
          onChange={(e) => set("currency", e.target.value as Currency)}
          className={bigInputClass + " h-auto"}
        >
          {CURRENCY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field id="onboarding-salary" label="Net monthly salary">
        <NumberInput
          id="onboarding-salary"
          decimalKeypad
          value={draft.salary}
          onChange={(v) => set("salary", num(v))}
          placeholder="0"
          autoFocus
        />
      </Field>

      <div className="grid gap-8 sm:grid-cols-2">
        <Field id="onboarding-hours-week" label="Hours per week">
          <NumberInput
            id="onboarding-hours-week"
            value={draft.hoursPerWeek}
            onChange={(v) => set("hoursPerWeek", num(v))}
          />
        </Field>
        <Field id="onboarding-hours-day" label="Hours per day">
          <NumberInput
            id="onboarding-hours-day"
            value={draft.hoursPerDay}
            onChange={(v) => set("hoursPerDay", num(v))}
          />
        </Field>
      </div>

      <Field
        id="onboarding-payments"
        label="Payments per year"
        hint="Use 14 for Spanish-style extra payments."
      >
        <NumberInput
          id="onboarding-payments"
          value={draft.paymentsPerYear}
          onChange={(v) => set("paymentsPerYear", num(v))}
        />
      </Field>
    </>
  );
}

/**
 * Step 2 — Expenses (dossier §16 "STEP 2"). A single field, and the step is
 * never gated: expenses are optional-but-encouraged, so `Continue →` stays live
 * even at zero (see `canContinue`, which gates step 1 alone).
 */
function ExpensesStep({
  draft,
  set,
}: {
  draft: Profile;
  set: <K extends keyof Profile>(key: K, value: Profile[K]) => void;
}) {
  return (
    <Field
      id="onboarding-expenses"
      label="Monthly fixed expenses"
      hint="Rent, groceries, subscriptions, transport, utilities."
    >
      <NumberInput
        id="onboarding-expenses"
        decimalKeypad
        value={draft.expenses}
        onChange={(v) => set("expenses", num(v))}
        placeholder="0"
        autoFocus
      />
    </Field>
  );
}

/**
 * Step 3 — Rules (dossier §16 "STEP 3"). Three controls, none gating: the
 * significance-threshold slider whose *label* carries the live percentage, and
 * the two savings figures.
 *
 * The threshold label is the interpolated string, not a separate readout, so
 * the slider's accessible name changes as it moves — that is how §16 records
 * it, and it is what makes the value reachable without a `data-testid`.
 *
 * The control is a native `<input type="range">` rather than the reference's
 * shadcn `Slider`: this port has no shadcn, and `SettingsScreen` already
 * established the native range with `accent-accent` for the same field. §16's
 * `pt-3` is kept, since it is a recorded literal.
 */
function RulesStep({
  draft,
  set,
}: {
  draft: Profile;
  set: <K extends keyof Profile>(key: K, value: Profile[K]) => void;
}) {
  return (
    <>
      <Field
        id="onboarding-threshold"
        label={`Significance threshold — ${draft.threshold}%`}
        hint="Purchases above this % of your monthly income are flagged."
      >
        <input
          id="onboarding-threshold"
          type="range"
          min={1}
          max={50}
          step={1}
          value={draft.threshold}
          onChange={(e) => set("threshold", num(e.target.value))}
          className="w-full accent-accent pt-3"
        />
      </Field>

      <div className="grid gap-8 sm:grid-cols-2">
        <Field id="onboarding-savings" label="Current savings">
          <NumberInput
            id="onboarding-savings"
            value={draft.savings}
            onChange={(v) => set("savings", num(v))}
            placeholder="0"
          />
        </Field>
        <Field
          id="onboarding-contribution"
          label="Extra monthly savings (optional)"
          hint="Money you consistently set aside on top of expenses."
        >
          <NumberInput
            id="onboarding-contribution"
            value={draft.monthlyContribution}
            onChange={(v) => set("monthlyContribution", num(v))}
            placeholder="0"
          />
        </Field>
      </div>
    </>
  );
}

/**
 * `bigInputClass` (dossier §5) verbatim — the onboarding/settings big-input
 * treatment. Onboarding's is `text-3xl` against settings' `text-2xl` (§4),
 * which is why this is not shared with `SettingsScreen`'s field.
 *
 * Plus the two classes the reference's shadcn `<Input>` contributes and its
 * route source never shows (#139, and #137 for the identical finding on
 * `/settings`): `h-9`, because this string sets padding but no height, and
 * `md:text-sm`, because `text-3xl` displaces the base's `text-base` but not its
 * `md:` variant — different keys, so the reference's fields are 30px type on
 * mobile and 14px from 768px up.
 */
const bigInputClass =
  "flex h-9 w-full border-0 border-b-2 border-border bg-transparent px-0 py-2 text-3xl font-bold outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-accent focus-visible:ring-0 rounded-none shadow-none md:text-sm";

/**
 * The onboarding `Field` wrapper (dossier §5): label, the control itself, and
 * an optional hint. It takes the control as `children` rather than owning an
 * input, which is what lets the currency `<select>` (#55) and the threshold
 * slider (#57) wear the same label/hint chrome as the number fields instead of
 * hand-copying it.
 */
function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * One `bigInputClass` number input. `value || ""` renders zero as empty (§7),
 * so a defaulted field reads as unfilled rather than as a literal zero — the
 * reference's own behaviour.
 *
 * `placeholder` is deliberately not defaulted: §16 gives `placeholder="0"` to
 * salary and expenses only; hours and payments carry none.
 */
function NumberInput({
  id,
  value,
  onChange,
  placeholder,
  autoFocus,
  decimalKeypad,
}: {
  id: string;
  value: number;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /**
   * `inputMode="decimal"` is on **salary and expenses only** in the reference
   * (`OnboardingWizard.tsx:130` and `:176`) — not on savings or the monthly
   * contribution, which are money too. That is inconsistent, and under #39's
   * bar an inconsistency in the reference is a requirement, so it is a prop
   * rather than a default (#108).
   */
  decimalKeypad?: boolean;
}) {
  return (
    <input
      id={id}
      type="number"
      inputMode={decimalKeypad ? "decimal" : undefined}
      placeholder={placeholder}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      // eslint-disable-next-line jsx-a11y/no-autofocus -- §16 records autoFocus on the first field of steps 1 and 2.
      autoFocus={autoFocus}
      className={bigInputClass}
    />
  );
}
