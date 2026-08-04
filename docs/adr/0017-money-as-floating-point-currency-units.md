# Money as floating-point currency units (supersedes 0012)

**Status:** Accepted. **Supersedes:** [ADR 0012](0012-money-as-integer-cents-round-date-up.md).

The reference implementation models money as **plain currency units held as
floating-point numbers** (e.g. `€19.99` is `19.99`), not integer minor units.
The rebuild adopts the reference model, superseding ADR 0012's integer-cents
mandate for the reference engine.

## What changed from ADR 0012

- **Floats, not integer cents.** All reference-engine inputs (`salary`,
  `expenses`, `savings`, `monthlyContribution`, `price`) and outputs are plain
  numbers. There is no minor-unit representation.
- **No rounding in the math.** The reference performs **no** rounding mid-calc:
  `hoursOfWork`, `daysOfWork`, `pctOfMonthlyIncome`, `monthsToSave`, `cutPct` are
  all raw ratios. Rounding is **presentational only**, applied at the display
  edge (`formatNumber` / `formatMoney`). ADR 0012's "round the Save-Up Date up"
  rule does not apply — the reference reports a continuous `monthsToSave` and a
  fixed 12-month `cutMonths`, neither of which is rounded up in the engine.

## Why this is acceptable

ADR 0012 warned that floats accumulate error across sums and projections
(`0.1 + 0.2 !== 0.3`). That risk is real but bounded here: the reference engine
does a handful of multiplications and divisions per evaluation with no
month-by-month integer accumulation, and every user-facing figure is a rounded
presentation of a raw ratio. Matching the reference exactly — so the rebuilt app
reproduces its semantics to the digit — outweighs the residual float risk, which
surfaces only far below the display precision. Reproducing the reference is the
governing constraint for this rebuild.

## Migration note (additive introduction)

The float-based reference engine ships **additively** in
`src/engine/reference-evaluate.ts` / `reference-types.ts`. The legacy
integer-cents engine (`evaluate.ts`, `money.ts`) and its ADR 0012 invariant were
deleted in #119; float currency units are now the app's only money model.
