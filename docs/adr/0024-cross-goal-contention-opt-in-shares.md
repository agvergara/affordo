# Cross-goal contention: opt-in Shares on a separate route

Status: accepted. Addresses the v1.2 work named in
[ADR 0007](0007-save-up-date-projection-assumptions.md), shipped as v1.1 (the
v1.1 camera Price Scan of [ADR 0005](0005-on-device-ocr-price-scan-v1.1.md) is
deferred indefinitely, pending an Android app that may never happen).

## Context

ADR 0007 point 3 evaluates every goal against the full Monthly Disposable, so
three goals may each report "6 months" though they cannot all be funded at once.
It called that deliberate and named the fix as v1.2 work.

The double-count is worse than 0007 recorded. `savings` is also claimed in full
by every goal — `reference-evaluate.ts:57` tests `savings >= price` per goal — so
€5,000 saved against two €5,000 goals reports **"Afford" on both**. That is not
optimism, it is false. Two resources are contended, a stock and a flow, and both
need an answer.

## Decision

**A goal may be assigned a Share: a monthly amount out of the Monthly Disposable.
Shares are opt-in, edited only on `/compare`, and change nothing about a goal's
own verdict.**

- **`/goals` is unchanged.** Every goal keeps the alone-figure the reference
  engine computes, and `evaluate(profile, goal)` is not touched. A Shared goal
  gains one muted line linking to `/compare` and carrying its Delay.
- **The stock follows the flow.** A goal's share of savings is derived from its
  share of the monthly — no second input, and a share that overshoots its price
  simply completes at month 0 and returns its surplus.
- **Freed money reflows proportionally.** When a goal is funded, its Share
  redistributes among those still unfunded, so the engine is an event-driven
  solve (earliest completion → redistribute → repeat) rather than a division.
- **Overdrawn is computed, never blocked.** Shares may exceed the disposable;
  `/compare` says so and still shows the timeline the plan implies.
- **Unassigned is a state, not a rate.** A goal with no Share draws nothing,
  releases nothing, and shifts nobody's Delay. It is not a goal that takes
  infinitely long.
- **No Verdict on `/compare`.** Months and Delay only.

## Considered options

- **Fix `/goals` instead** — recompute every card against its Share. Rejected at
  the cost of the contradiction below: it would put numbers the reference engine
  cannot produce onto the reference's own screen, and a goal would visibly get
  worse the moment it was opted in.
- **No reflow, with the assumption worded honestly** — ADR 0007's own trick.
  Rejected: without reflow a €1,200 goal at €100/mo reports 12 months when the
  true answer is 6, and unlike 0007's simplification this one errs toward
  discouragement, which ADR 0010 asks us not to do.
- **Explicitly assigned savings**, a second number per goal. Rejected as input
  burden for a case the proportional rule already handles.
- **Shares set in `GoalDialog`.** Rejected: a Share is meaningless on a first
  goal, setting one without the other goals and the running total in view is
  setting it blind, and it would put net-new surface in the app's most
  reference-faithful component.

## Consequences

**`/goals` and `/compare` will disagree, on purpose.** Two €5,000 goals against
€5,000 saved still read "Afford" on both cards; only the Delay line and
`/compare` hint otherwise. This is the price of keeping the reference screen
reference-faithful, and it is a known limitation, not an oversight.

`cutToAfford` has no per-Share meaning — its lever, `expenses * 0.5`, is a
property of the profile and lands in a pot several goals draw from. This is why
`/compare` carries no Verdict badge, and why extending the four-way model to
Shares should be refused if proposed later.

Delay needs a solo baseline the reference engine does not emit: `monthsToSave` is
non-null only on the `stretch` path, and `GoalCard.tsx:70-76` renders the
`cutMonths` fallback as "12 months \*". The comparison engine therefore computes
its own baseline with the same arithmetic. **Making `evaluate` populate
`monthsToSave` unconditionally is a fidelity regression, not a cleanup** — it
would silently change what every `cutToAfford` card on `/goals` displays.

Persistence stays at `schemaVersion: 1`. `share` is an optional field, absent
means Unassigned, which is already the correct reading of every goal saved
before this feature — so the migration is a no-op by construction, and bumping
the version would instead have destroyed every saved goal, since
`goals-store.ts:53-58` discards rather than migrates on a version mismatch.
Per ADR 0019 a stored `share` is range-checked on load, not merely type-checked.
