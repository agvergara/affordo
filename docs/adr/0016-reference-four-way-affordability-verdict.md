# Reference four-way affordability verdict (supersedes 0007)

**Status:** Accepted. **Supersedes:** [ADR 0007](0007-save-up-date-projection-assumptions.md).

The rebuild replaces the three-way Affordability Verdict
(`affordable-now` / `save-up` / `not-reachable`) with the reference
implementation's **four-way** verdict (docs/affordo-context.md §8):
`afford` / `stretch` / `cutToAfford` / `cannot`.

## Decision tree

Let `monthlyDisposable = salary - expenses + monthlyContribution` and
`remaining = max(0, price - savings)`.

1. `savings >= price` → **`afford`**.
2. else if `monthlyDisposable > 0`:
   - `monthsToSave = remaining / monthlyDisposable`; if `<= 12` → **`stretch`**.
   - else `targetMonthly = remaining / 12`, `extraNeeded = targetMonthly - monthlyDisposable`,
     `maxCut = expenses * 0.5`; if `extraNeeded <= maxCut` → **`cutToAfford`**
     (`cutPct = expenses > 0 ? extraNeeded / expenses * 100 : 0`, `cutMonths = 12`);
     else → **`cannot`**.
3. else (no surplus): `targetMonthly = remaining / 12`, `maxCut = expenses * 0.5`;
   if `targetMonthly - monthlyDisposable <= maxCut` → **`cutToAfford`**
   (analogous `cutPct`, `cutMonths = 12`); else → **`cannot`**.

Non-chosen numeric fields (`monthsToSave`, `cutPct`, `cutMonths`) are `null`.

## What changed from ADR 0007

- **New `cutToAfford` outcome.** The reference introduces an explicit "reachable
  only by cutting expenses" verdict, gated on a cut of **≤ 50% of expenses**
  reaching the goal within a fixed **12-month** horizon. The legacy engine had no
  such outcome — a negative surplus was flatly `not-reachable`.
- **Fixed 12-month reference horizon.** `stretch` requires `monthsToSave <= 12`
  and `cutToAfford` targets 12 months. The legacy engine projected an open-ended
  `save-up` month count with no cap.
- **Contribution semantics.** The reference treats `monthlyContribution` as an
  additive term in `monthlyDisposable` (defaulting to 0), rather than the legacy
  "full surplus by default, optionally a smaller capped contribution" model.
- **Retained simplifications.** ADR 0007's honest simplifications still hold in
  spirit: no interest/investment growth, and each goal projected independently
  (optimistic across multiple goals). These remain v1.2 work; do not "fix" them.

## Migration note (additive introduction)

The reference verdict ships **additively** in `src/engine/reference-evaluate.ts`
(`evaluateReference`, returning `ReferenceVerdict`). The legacy three-way
`evaluate` still backs the current UI and keeps compiling; it — and this ADR's
superseded predecessor — is removed when the last consumer migrates in a later
slice.
