# Domain-range validation on the store load path (defence in depth)

Status: accepted (resolves issue #81, a truce from #47 / PR #78).

## Context

The reference persistence layer (`src/state/profile-store.ts`,
`src/state/goals-store.ts`) validates a stored record's **shape** on load: every
field present, the right type, a known currency, the matching `schemaVersion`
(ADR 0011 defensive load). The type guards (`isProfile`, `isGoal`) gated on
`isFiniteNumber` alone.

A value can be the right *type* yet outside its *domain*: `paymentsPerYear: 0`,
a negative `salary`, a `threshold` far off its percentage scale, a negative goal
`price`. Such a record passes the shape check and flows into verdict
computation, where it produces nonsense — an `Infinity` hourly rate from a zero
divisor, a negative monthly disposable from negative expenses, a negative time
cost. localStorage is user- and script-writable, so this is not only a migration
edge but a hostile-input surface: the store is a trust boundary.

Two different boundaries enforce ranges, at two different strictnesses, and the
dossier is explicit about which governs the store:

- The **onboarding input layer** (dossier §7 form table, §8): `canContinue =
  salary>0 && hoursPerWeek>0 && hoursPerDay>0 && paymentsPerYear>0`, and the
  `threshold` slider is fixed `min=1 max=50`. These gate what a user can *enter*.
- The **on-load `ProfileSchema`** (dossier §7, verbatim: "validation on load,
  not on input"): `salary` **nonnegative**; `hoursPerWeek`/`hoursPerDay`/
  `paymentsPerYear` **positive**; `threshold` **0–100**; `expenses`/`savings`/
  `monthlyContribution` nonnegative. This governs what the *store* accepts.

The on-load schema is deliberately looser than `canContinue`: a persisted
`salary: 0` is the legitimate *pre-onboarding* state, and `threshold` is a 0–100
percentage even though the slider only exposes 1–50. The store must honour the
on-load schema, not the input-layer rules — those are a different boundary.

## Decision

**The input layer stays the primary enforcement point; the store validates the
on-load `ProfileSchema` ranges as defence in depth.** Both layers guard, at
different boundaries and strictnesses — the input layer gates what a user
enters, the store rejects a domain-invalid record that arrived by any other
route (corruption, a crafted value, a foreign writer).

The store's ranges are the dossier's on-load `ProfileSchema`, **not** the
stricter `canContinue` / slider bounds. Applying the input-layer rules on load
would wrongly discard schema-valid records — e.g. a `salary: 0` pre-onboarding
profile, or a `threshold` of 0 or 60.

The store *rejects*, it does not *clamp*. Clamping (coercing `salary: -100` to
`0`, or a `threshold: 150` to `100`) would invent a value the user never chose.
Rejection matches the existing defensive-load contract: a corrupt profile
degrades whole to `defaultProfile`; a corrupt goal row is dropped and the valid
rows are kept.

Ranges enforced on load (the on-load `ProfileSchema`):

| Field | Rule | Why |
| --- | --- | --- |
| `salary` | `>= 0` | nonnegative; `0` is the valid pre-onboarding state |
| `hoursPerWeek`, `hoursPerDay`, `paymentsPerYear` | `> 0` | positive divisors behind hourlyRate / daysOfWork |
| `expenses`, `savings`, `monthlyContribution` | `>= 0` | a negative would inflate disposable income |
| `threshold` | `0..100` inclusive | a percentage scale (the 1–50 slider is an input-layer bound) |
| goal `price` | `>= 0` | a negative price is domain-invalid; `0` is a legitimately free item |

`defaultProfile` carries `salary: 0`, which is now in range (nonnegative) and so
accepted by `isProfile`. That is consistent: it is both the fallback and a valid
persisted pre-onboarding record.

## Consequences

- A hostile or corrupt localStorage value can no longer drive verdict
  computation — the store fails safe to defaults (profile) or drops the row
  (goal), the same failure mode as a shape-invalid record.
- The store's ranges track the dossier's on-load `ProfileSchema`, not the input
  layer; a change to that schema is the prompt to revisit this ADR. The stricter
  `canContinue` gating is the onboarding slice's to own.
- No clamping means no silently-altered user data; an out-of-range record is
  treated as absent, not corrected.
