# Upfront onboarding wizard for the profile (supersedes 0006)

**Status:** Accepted. **Supersedes:** [ADR 0006](0006-progressive-disclosure-onboarding.md).

Affordo builds the user's financial profile through an explicit, upfront
four-step onboarding wizard at `/onboarding` — Welcome, Income, Expenses, Rules
— rather than the staged progressive-disclosure input flow ADR 0006 mandated.
The wizard is a single component with local `step` state `0..3`; it carries a
persistent chrome (eyebrow, current step heading, `NN / 04` counter, a
four-segment progress bar filling up to the current step, and a Back / primary
footer) with the step bodies swapped underneath. The primary control reads
`Start` on the first step, `Finish setup` on the last, and `Continue` between;
Back is disabled on the first step. Only the Income step gates advancement.

## Why supersede 0006

ADR 0006 forbade "a big upfront onboarding wizard", arguing that a wall of forms
scares users off before they see any value, and that Affordo should reveal
inputs only as the next answer requires them. That decision was made for the
original single-calculator screen at `/`, where the first striking Time Cost had
to be earned after ~3 fields.

The rebuild's authoritative reference (docs/affordo-context.md) reproduces the
reference product in full, and that product **does** separate profile setup from
the goal-by-goal answer:

- **The wizard builds the profile once; the calculator answers many times.** The
  Time Cost / Verdict / Save-Up answer now lives on the `/goals` screen, per
  goal. Onboarding is a one-time setup of Income, Expenses, and Rules, not the
  place value is first shown — so the "show a number after 3 fields" pressure
  that justified 0006 no longer applies to this flow.
- **Every step still has sensible defaults**, and only Income gates advancement,
  so the wizard is not a wall of required forms: a user can walk Welcome →
  Finish with the defaults intact. The progressive spirit of 0006 — sensible
  defaults, precision as an optional refinement — is preserved inside the steps.
- **Parity is the rebuild's constraint.** The TARGET CONSTRAINTS in the dossier
  require the router, routes, wizard, step counter, and Back/Start controls to
  be reproduced. Keeping 0006's prohibition would put the ADR in direct conflict
  with the spec the rebuild is executing against.

The staged, reveal-as-you-go philosophy of 0006 is not wrong in general; it is
simply not how this profile-setup flow is built. This ADR records that the
upfront wizard is the accepted shape for onboarding, and lifts 0006's
prohibition on it.
