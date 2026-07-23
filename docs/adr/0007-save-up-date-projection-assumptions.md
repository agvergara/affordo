# Save-Up Date projection assumptions (v1)

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
