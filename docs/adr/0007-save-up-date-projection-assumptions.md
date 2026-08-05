# Save-Up Date projection assumptions (v1)

**Status:** Superseded by [ADR 0016](0016-reference-four-way-affordability-verdict.md).
The four-way reference verdict was introduced additively, and the legacy engine
this ADR governed was deleted in #119 — but the projection assumptions below are
**not** historical, because the reference engine makes the same ones. It computes
`monthsToSave = remaining / monthlyDisposable` with no compounding (point 2), and
evaluates one goal at a time against the full disposable figure (point 3), so the
optimism point 3 warns about is live behaviour today. What did not survive: the
reference reports a **duration in months**, never a calendar date, and has no
Windfalls — so the "Windfalls to Savings" half of point 1 describes nothing
shipped. The custom monthly Contribution half is live, folded into
`monthlyDisposable`.

The Save-Up Date is projected under three deliberate simplifications:

1. **Full Surplus by default.** All monthly Surplus is assumed to go toward the
   goal, worded honestly ("if you save everything left over…"). The user may
   optionally set a smaller custom monthly Contribution, and may add optional
   one-off Windfalls to Savings.
2. **No interest or investment growth.** Savings are not compounded. For typical
   save-up horizons this is a rounding error, and it keeps the math transparent
   and deterministic.
3. **Each Goal is projected independently**, each assuming the full Surplus. With
   multiple saved goals this is optimistic and internally inconsistent — three
   goals may each report "6 months" though they cannot all be funded at once.

Point 3 will look like a bug to a future reader: it is deliberate. Modeling
competing goals (cross-goal interaction, "buying X delays Y") is the v1.2 work.
Do not "fix" independent per-goal dates in v1; word results so the optimism is
visible instead.
