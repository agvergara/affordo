# Progressive disclosure: time-to-first-answer over completeness

**Status:** Superseded by [ADR 0020](0020-upfront-onboarding-wizard.md).

Affordo's input flow is staged, not a single upfront form. Inputs are revealed
only as the next answer requires them, mirroring the three questions the app
answers:

1. **Time Cost** — price + monthly net income + hours/week (default 40). The
   first number appears after ~3 fields.
2. **Affordability Verdict** — then ask current savings.
3. **Save-Up Date** — then ask expenses, starting as a single estimated monthly
   figure.

Everything askable has a sensible default (hours/week 40, payments/year 12).
Precision features agreed elsewhere — itemized expenses with per-item frequency
(ADR/CONTEXT), pay-periods — exist as optional "make this more accurate"
refinements, never as required fields at the door. Rationale: a wall of forms
scares users off before they see any value; showing a striking Time Cost after a
few fields earns the right to ask for more. This constrains how every input
feature is built — do NOT introduce a big upfront onboarding wizard.
