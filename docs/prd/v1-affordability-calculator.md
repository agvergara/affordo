# Affordo v1 — Product Requirements Document

> The v1 PRD, originally tracked as GitHub issue #1 and now fully shipped
> (children #2–#7 and #20). Kept here as the frozen record of what v1
> promised and delivered. The glossary lives in [`CONTEXT.md`](../../CONTEXT.md);
> the decisions behind it live in [`docs/adr/`](../adr).

---

## Problem Statement

People routinely make purchase decisions — from a phone to a car to a home — without a gut feel for what the money actually costs them. Price tags are abstract: "€1,000" doesn't convey that it's a week of your working life, or that buying it now means going into debt, or that saving for it would take until next spring. As a result, people over-spend, lean on loans and BNPL for things they can't really afford, and have no simple way to answer two basic questions: **"Can I afford this?"** and **"If not, when could I?"** Existing budgeting tools demand heavy setup, connect to bank accounts (a privacy and regulatory burden), and still don't reframe cost in terms people feel.

## Solution

Affordo is a privacy-first, client-only web app. The user enters what they earn and spend (manually — nothing leaves their browser), then names a purchase. Affordo answers, in plain language:

- **Time Cost** — how many hours/days of their working life the purchase costs, expressed in adaptive Work-Time Units.
- **Affordability Verdict** — Affordable Now, a Save-Up Date ("you'll have this by March 2027 if you save your surplus"), or Not Reachable at the current rate (with the monthly shortfall and the expense lever that would change it).
- A **think-twice challenge** when the purchase exceeds a customizable Significance Threshold (default 10% of monthly net income), nudging reflection over impulse debt.

The voice is deliberately provocative but never shaming: it challenges the decision, not the person. Users can save purchases as named Goals to revisit. All data stays in the browser (localStorage); the app tells the user this as a trust signal.

## User Stories

1. As a prospective buyer, I want to enter a purchase price and instantly see its Time Cost in hours/days of work, so that I feel the real cost rather than an abstract number.
2. As a new user, I want to get a first meaningful answer after entering only a few fields, so that I'm not scared off by a wall of forms.
3. As a user, I want to enter my monthly net take-home pay and typical hours per week, so that the app can compute my Net Hourly Wage without me knowing it.
4. As a European user paid in 14 instalments, I want to specify my payments-per-year, so that my true monthly income isn't understated.
5. As a user, I want to see whether I can afford a purchase right now from my savings, so that I know if I can just buy it.
6. As a user who can't afford something yet, I want to see the date I could afford it if I save, so that I can plan toward it.
7. As a user, I want to add my recurring expenses so my Surplus is accurate, so that my Save-Up Date is realistic.
8. As a user, I want to enter expenses as itemized line items with their own frequency (weekly/monthly/quarterly/annual), so that irregular bills are captured correctly.
9. As a user who wants speed over precision, I want to give a single estimated monthly expense figure first, so that I can get an answer before itemizing.
10. As a user, I want expense itemization and pay-period settings to be optional refinements, so that I can improve accuracy only if I choose to.
11. As a user, I want to optionally set a custom monthly contribution smaller than my full Surplus, so that the projection reflects what I'll really save.
12. As a user expecting a bonus or windfall, I want to add a one-off lump toward a goal, so that I can see how much sooner I'd afford it.
13. As a user whose expenses meet or exceed income, I want a clear "Not Reachable at your current rate" result instead of a broken or negative date, so that I get an honest answer.
14. As a user in the Not Reachable state, I want to see my monthly shortfall and a hint at the expense lever, so that I understand what would change the outcome.
15. As a user considering a significant purchase, I want the app to challenge me to think twice, so that I pause before impulse-spending or taking on debt.
16. As a user, I want to customize the Significance Threshold percentage and its reference period (monthly/annual), so that the challenge fires at a level that fits my finances.
17. As a user, I want to save a purchase as a named Goal, so that I can revisit its verdict and Save-Up Date later.
18. As a user, I want to keep several Goals, so that I can track multiple things I'm considering.
19. As a returning user, I want my financial profile remembered, so that I don't re-enter my salary every visit.
20. As a privacy-conscious user, I want to be told my data never leaves my browser, so that I trust the app with sensitive salary information.
21. As a mobile user, I want to scan a price tag with my camera to fill in the price, so that I don't have to type it. (v1.1)
22. As a mobile user, I want to correct a scanned price if the OCR is wrong, so that an imperfect scan never blocks me. (v1.1)
23. As a desktop user, I want to type the price directly, so that I'm not asked for a photo that makes no sense on desktop.
24. As a European user, I want prices and amounts shown and parsed with European number formatting (decimal comma), so that my inputs aren't misread.
25. As a user, I want to be advised of the European number convention, so that I don't accidentally enter the wrong magnitude.
26. As a user outside the Eurozone, I want to pick my currency symbol (€/£/$), so that amounts display in my currency.
27. As a user, I want large purchases shown in the most readable Work-Time Unit (hours → work days → weeks → months), so that a home isn't reported as thousands of hours.
28. As a user, I want a "work day" to be based on my own contracted hours, so that the Time Cost is personal and honest.
29. As a user with a very small surplus, I want an honest long-horizon Save-Up Date rather than a falsely optimistic one, so that I'm not misled.
30. As a user, I want money figures to be accurate to the cent with no floating-point drift, so that totals and projections are trustworthy.
31. As a user, I want the Save-Up Date to never be earlier than I could actually afford the purchase, so that the plan is safe to rely on.
32. As a user, I want the app to work entirely offline in my browser after loading, so that I can use it without connectivity concerns.

## Implementation Decisions

**Architecture (per ADRs 0004, 0008, 0009).** Client-only TypeScript SPA, no backend. React DOM + Vite, deployed as a static bundle. All domain logic lives in an isolated, framework-agnostic pure-TypeScript **engine** module with zero UI/DOM/framework imports; the UI depends on the engine, never the reverse.

**Engine public API (primary seam).** A single pure entry point, roughly `evaluate(profile, purchase, settings) → Evaluation`, computing the full result from a financial profile, a purchase, and settings. The `Evaluation` includes: the Affordability Verdict (a tagged union — `AffordableNow` / `SaveUpDate` / `NotReachable`), the Time Cost expressed in the chosen Work-Time Unit, and whether the Significance Threshold challenge fires (plus the shortfall/lever data in the `NotReachable` case). Derived values (Net Hourly Wage, Surplus) are computed internally, not supplied by the caller.

**Domain model (per CONTEXT.md).** Income = monthly net take-home + hours/week + payments-per-year, normalized to a true monthly average; single steady source in v1. Net Hourly Wage = monthly net ÷ monthly hours. Surplus = Income − recurring (itemized, frequency-normalized) expenses. Save-Up Date projects when Savings + accumulated Contributions reach the price, under fixed assumptions (ADR 0007): full Surplus by default (optional smaller custom Contribution), no interest/growth, each Goal projected independently. Optional one-off Windfalls add to Savings.

**Affordability outcomes (per CONTEXT.md).** Three-way verdict. `NotReachable` is a distinct state when Surplus ≤ 0 — the engine never emits ∞/NaN/negative durations; it returns the monthly shortfall and expense-lever data instead.

**Money & rounding (per ADR 0012).** Money represented and computed as integer minor units (cents); formatted to 2 decimals only at display. Time Cost is a derived display ratio (float acceptable), rounded per unit. Save-Up Date rounds the number of contribution periods up.

**Input flow (per ADR 0006).** Progressive disclosure in three stages mirroring the three answers (Time Cost → Verdict → Save-Up Date). Everything askable has a default (hours/week 40, payments/year 12). Itemization and pay-periods are optional refinements, never upfront-required.

**Price Capture (per ADR 0005).** Device-adaptive: desktop is manual entry; mobile web adds an optional camera Price Scan via **on-device** OCR (browser Text Detection API or Tesseract.js/WASM), result always editable. Price Scan ships in v1.1; manual entry is the v1 path and the scan fallback. Price parsing handles European formatting (`1.234,56 €`).

**Localization (per CONTEXT.md).** € default with a basic currency-symbol picker (€/£/$), cosmetic only (no FX). European number formatting throughout, with a UI advisory of the convention. English copy. No full i18n in v1.

**Persistence (per ADR 0011).** Financial profile and saved Goals stored as plain JSON in localStorage, same-origin only. A `schemaVersion` field is stored to support future migrations. No encryption in v1 (embedded-key encryption is rejected as theater); the UI communicates "your data never leaves your browser" as a trust signal. Durable/cross-device storage is out of scope.

**Voice (per ADR 0010).** Provocative but never shaming — challenge the decision, not the person. The Significance Threshold (default 10% of monthly net income; percentage and reference period both customizable) triggers a think-twice challenge. No dark patterns; the nudge always points toward saving/reflection.

## Testing Decisions

**What makes a good test:** assert external, observable behavior — for the engine, the returned `Evaluation` for a given input; for the UI, what the user sees and can do — never internal implementation details. Tests should read as specifications of behavior a user or caller depends on.

**Seam 1 — Engine (Vitest), near-exhaustive.** The primary seam. Table-driven unit tests against `evaluate(...)` covering every surfaced case: Affordable Now, Save-Up Date, and Not Reachable (Surplus ≤ 0, with shortfall/lever); tiny-but-positive Surplus (honest long horizon); Windfalls; custom Contribution vs full Surplus; payments-per-year normalization (12/14); Net Hourly Wage and Surplus derivation; Significance Threshold boundaries (below/at/above, custom %, monthly vs annual basis); Work-Time Unit ladder selection; European number parsing; integer-cents arithmetic (no float drift); round-date-up. This is where correctness bugs would be wrong-money advice, so coverage is heaviest here.

**Seam 2 — E2E (Playwright), in v1 (per ADR 0013).** Full user journeys through the running app in a browser: progressive-disclosure stages producing each answer, saving/revisiting Goals, the desktop manual-entry Price Capture path, the currency picker, and the "never leaves your browser" messaging. Tests observable behavior only.

**Seam 3 — UI components (React Testing Library), pragmatic/thin.** Critical progressive-disclosure stages and device-adaptive Price Capture rendering. Kept thin because logic is covered at Seam 1.

**Prior art:** none yet (greenfield). These seams and conventions establish the prior art for the codebase.

## Out of Scope

- Financing / loans / mortgages (cash + save-up only) — ADR 0001.
- Bank/open-banking integration and any automatic data import (PSD2/AISP burden) — ADR 0003.
- Any backend, server-side compute, or accounts — ADR 0004.
- Camera Price Scan / OCR (deferred to v1.1) — ADR 0005.
- Cross-goal interaction / prioritization ("buying X delays Y") (deferred to v1.2) — Goals are independent in v1.
- Variable-income tracking with sweep-into-savings, and the Real Hourly Wage refinement (deferred to v2).
- At-rest encryption of local data, and durable/cross-device/permanent storage — ADR 0011.
- Interest/investment growth in projections — ADR 0007.
- Full internationalization (translated copy, per-locale number formats, currency conversion/FX).
- React Native / native mobile app — ADR 0009.

## Further Notes

- Roadmap: **v1** (this PRD) — engine + calculator with saved Goals, progressive disclosure, three-layer tests. **v1.1** — mobile camera Price Scan. **v1.2** — cross-goal interaction. **v2** — variable-income tracking + Real Hourly Wage; later, durable storage and an Android app.
- The engine must remain framework-agnostic so a future Android app (React Native or Kotlin) can reuse it untouched (ADR 0008/0009).
- The full glossary is in `CONTEXT.md`; all 13 ADRs are in `docs/adr/`. Use the glossary vocabulary in code and copy.

