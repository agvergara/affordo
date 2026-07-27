import { useState } from "react";
import { AppHeader } from "./AppHeader";

/**
 * The onboarding wizard chrome (docs/affordo-context.md §5/§16). This slice
 * builds the persistent shell only — the four steps render as empty
 * placeholders; their inputs, gating, and the finish-then-persist behaviour
 * land in later slices.
 *
 * A single component with local `step` state `0..3`. The header sits above with
 * `showTimeValue={false}` (the wizard has no profile to price yet). The chrome
 * carries the eyebrow, the current step heading, the `NN / 04` counter, a
 * four-segment progress bar filling up to the current step, and a footer with a
 * Back control (disabled on step 0) and the primary control whose label follows
 * the Start / Continue / Finish setup rule. Class strings reproduce the
 * reference verbatim.
 */

/** The four step headings, indexed by `step`. */
const steps = ["Welcome", "Income", "Expenses", "Rules"] as const;

export function OnboardingWizard() {
  const [step, setStep] = useState(0);

  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

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

        {/* Steps render as empty placeholders in this slice. */}
        <div key={step} className="animate-slide-up space-y-8" />

        <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="font-mono text-[11px] font-bold uppercase tracking-widest"
          >
            {"← Back"}
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            className="rounded-none bg-foreground px-6 py-6 font-mono text-[11px] font-bold uppercase tracking-widest text-background hover:bg-accent hover:text-accent-foreground"
          >
            {primaryLabel}
          </button>
        </div>
      </main>
    </div>
  );
}
