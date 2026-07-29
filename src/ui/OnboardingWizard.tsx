import { useState } from "react";
import { AppHeader } from "./AppHeader";
import { useAffordo } from "../state/AffordoProvider";
import { defaultProfile, type Profile } from "../state/profile-store";
import type { Currency } from "../engine/reference-types";

/**
 * How the wizard leaves for the next screen. Mirrors `Router`'s `Navigate`
 * (`(to: string) => void`): the client-only SPA (ADR 0004/0009) has no history
 * router, so a redirect is a real location change; tests inject a spy instead.
 */
export type Navigate = (to: string) => void;

const defaultNavigate: Navigate = (to) => window.location.replace(to);

/**
 * The onboarding wizard (docs/affordo-context.md §15/§16). The shell chrome
 * (#51) plus this slice's draft plumbing and finish action (#53). The four
 * steps still render as empty placeholders — their inputs and gating land in
 * later slices (#55–57); this slice owns only the local draft Profile and the
 * finish-then-persist behaviour.
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
    String(step + 1).padStart(2, "0") + " / " + String(steps.length).padStart(2, "0");

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader showTimeValue={false} />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
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

        <div className="mb-10 flex gap-1.5" data-testid="progress-bar" aria-hidden>
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 ${i <= step ? "bg-foreground" : "bg-border"}`}
            />
          ))}
        </div>

        {/* Steps 2–3 render as empty placeholders until #56–#57 land. */}
        <div key={step} className="animate-slide-up space-y-8">
          {step === 0 && <WelcomeStep />}
          {step === 1 && <IncomeStep draft={draft} set={set} />}
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="border-0 bg-transparent p-0 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            {"← Back"}
          </button>
          <button
            type="button"
            onClick={next}
            className="rounded-none bg-foreground px-6 py-6 font-mono text-[11px] font-bold uppercase tracking-widest text-background hover:bg-accent hover:text-accent-foreground"
          >
            {primaryLabel}
          </button>
        </div>
      </main>
    </div>
  );
}

/**
 * Step 0 — Welcome (dossier §15 "Step 0"). No fields: three stacked text
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

/** The currency options, in the dossier's order, with their symbols (§15). */
const CURRENCY_OPTIONS: ReadonlyArray<{ value: Currency; label: string }> = [
  { value: "EUR", label: "EUR — €" },
  { value: "GBP", label: "GBP — £" },
  { value: "USD", label: "USD — $" },
];

/**
 * Step 1 — Income (dossier §15 "Step 1"). The only step that gates: the
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
      <div className="space-y-2">
        <label
          htmlFor="onboarding-currency"
          className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
        >
          Currency
        </label>
        <select
          id="onboarding-currency"
          value={draft.currency}
          onChange={(e) => set("currency", e.target.value as Currency)}
          className="w-full border-b border-border bg-transparent py-2 text-3xl font-bold transition-colors focus-visible:border-accent focus-visible:outline-none"
        >
          {CURRENCY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
