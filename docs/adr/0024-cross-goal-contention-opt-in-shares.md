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

## Amendments from building it (#155–#159, #170, #172, #174)

This ADR was written before any of it existed. Five things the implementation
settled or changed, recorded here rather than left to be rediscovered from
commit messages.

**Delay is zero when a Share IS the whole disposable**, not merely when a goal
is the only one sharing. Issue #156 said both and they disagree: one goal
assigned €100 of a €2,500 surplus is not commanding all of it. `CONTEXT.md`
governs — alone means the whole Monthly Disposable _and_ the whole savings pot.
A lone under-assigned goal therefore has a positive Delay, which is useful
rather than pedantic: it says the user is under-committing.

**A negative Delay is possible and means something.** It is reachable only on
an Overdrawn plan — a Share is at most the whole disposable unless the Shares
overdraw it — so it is the signature of spending money that is not there, not a
value to clamp away.

**Savings are capped and re-offered, not merely divided.** A goal whose
proportional cut exceeds its price cannot use the excess; stranding it there
would make every other goal's date pessimistic for nothing. The allocation
repeats until the pot is spent or nobody is short.

**A goal outside the plan can still be reported as covered by savings** (#170),
measured against what the plan has _not_ spent (#174). This is a deliberately
weaker claim than the one made for a goal in the plan, and unlike that one it
can be true of several goals at once — the same limitation this ADR already
records for `/goals`, now visible on `/compare`. #172 makes its cost legible by
stating what each goal takes and what survives the plan.

**`fundedFromSavings` is stated by the engine, not inferred from `months === 0`**
(#174). That sentinel meant two things — bought before the clock started, and,
through a float pathology, the schedule went wrong — and the screen turns it
into a sentence about where money came from. A goal funded instantly by an
absurd Share is funded; it is not funded _from savings_, and only the engine can
tell those apart.

### The failure worth remembering

Seven of these commits shipped without independent review, and the review, when
it finally ran, found that a plan with prices near €10⁷ could report a goal at
**month zero** — rendered "Funded through savings" — against a balance of
nothing. One ulp of such a balance exceeds the settling epsilon, so a goal was
never retired, a round was spent moving the clock nowhere, and the loop bound
starved the next goal.

The fix is in the engine. The lesson is in `comparison.test.ts`: a **conservation
property** — `assigned × (last completion) = total priced − savings drawn` —
catches it in one line and would have caught it the day it was written. Every
other test in that file checks one example. Reach for the invariant first.
