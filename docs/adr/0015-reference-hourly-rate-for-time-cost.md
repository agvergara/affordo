# Reference hourly rate for Time Cost (supersedes 0002)

**Status:** Accepted. **Supersedes:** [ADR 0002](0002-net-hourly-wage-for-time-cost.md).

The rebuild aligns Affordo's Time Cost with the reference implementation
(docs/affordo-context.md §8). The reference derives the per-hour value of the
user's time directly from the profile inputs, not from a monthly-hours average:

```
hourlyRate  = hoursPerWeek > 0 ? (salary * paymentsPerYear) / (52 * hoursPerWeek) : 0
hoursOfWork = hourlyRate > 0 ? price / hourlyRate : Infinity
daysOfWork  = hoursPerDay > 0 ? hoursOfWork / hoursPerDay : Infinity
```

## What changed from ADR 0002

- **Annualized, then hourly.** The reference annualizes take-home
  (`salary * paymentsPerYear`) and divides by yearly contracted hours
  (`52 * hoursPerWeek`). The legacy engine instead computed a monthly-hours
  average (`hoursPerWeek * 52 / 12`) and divided normalized monthly net by it.
  The two agree for `paymentsPerYear = 12`; they diverge otherwise, and the
  reference form is now authoritative.
- **Still net, not real.** ADR 0002's core stance — Net Hourly Wage over the
  *Your Money or Your Life* Real Hourly Wage, chosen for a friction-free "whoa"
  moment — is retained unchanged. Real Hourly Wage remains a later refinement.
- **Divide-by-zero yields 0 / Infinity, never NaN.** `hourlyRate` is 0 when the
  user works zero weekly hours; `hoursOfWork` and `daysOfWork` are `Infinity`
  when their divisor is 0. These sentinels are formatted at the display edge.

## Migration note (additive introduction)

The reference engine is introduced **additively** as
`src/engine/reference-evaluate.ts` (exported as `evaluateReference`). The legacy
three-way engine in `src/engine/evaluate.ts` was deleted in #119 once its last
consumer was gone, so `evaluateReference` is now the only engine — this ADR
describes what ships rather than one of two coexisting models.
