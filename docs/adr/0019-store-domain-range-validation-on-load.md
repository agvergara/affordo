# Domain-range validation on the store load path (defence in depth)

Status: accepted (resolves issue #81, a truce from #47 / PR #78).

## Context

The reference persistence layer (`src/state/profile-store.ts`,
`src/state/goals-store.ts`) validates a stored record's **shape** on load: every
field present, the right type, a known currency, the matching `schemaVersion`
(ADR 0011 defensive load). The type guards (`isProfile`, `isGoal`) gated on
`isFiniteNumber` alone.

A value can be the right *type* yet outside its *domain*: a negative `salary`,
`paymentsPerYear: 0`, a `threshold` outside the onboarding slider's 1–50, a
negative goal `price`. Such a record passes the shape check and flows into
verdict computation, where it produces nonsense — `Infinity` hourly rate from a
zero divisor, a negative monthly disposable from negative expenses, a negative
time cost. localStorage is user- and script-writable, so this is not only a
migration edge but a hostile-input surface: the store is a trust boundary.

The reference design (dossier §8) puts domain-range enforcement at the
**onboarding input layer**: `canContinue = salary>0 && hoursPerWeek>0 &&
hoursPerDay>0 && paymentsPerYear>0`, and the `threshold` slider is fixed to
`min=1 max=50`. A well-behaved user's data therefore never leaves that layer
out of range. But a value that never passed through the input layer — a corrupt
or crafted localStorage record — bypasses that guard entirely.

## Decision

**The input layer stays the primary enforcement point; the store validates
domain ranges on load as defence in depth.** Both layers guard, at different
boundaries — the input layer prevents an out-of-range value from being
persisted, the store rejects one that arrived by any other route.

The store *rejects*, it does not *clamp*. Clamping (coercing `salary: -100` to
`0`, or a `threshold: 99` to `50`) would invent a value the user never chose and
duplicate business meaning in the wrong layer. Rejection matches the existing
defensive-load contract: a corrupt profile degrades whole to `defaultProfile`; a
corrupt goal row is dropped and the valid rows are kept.

Ranges enforced on load:

| Field | Rule | Why |
| --- | --- | --- |
| `salary`, `hoursPerWeek`, `hoursPerDay`, `paymentsPerYear` | `> 0` | `canContinue`; divisors behind hourlyRate / daysOfWork |
| `expenses`, `savings`, `monthlyContribution` | `>= 0` | a negative would inflate disposable income |
| `threshold` | `1..50` inclusive | matches the onboarding slider's fixed range |
| goal `price` | `>= 0` | a negative price is domain-invalid; `0` is a legitimately free item |

`defaultProfile` itself carries `salary: 0`, which is out of range. That is
intentional and safe: `defaultProfile` is the *fallback*, never round-tripped
through `isProfile`. A fresh user has no stored record and the onboarding layer
raises `salary` above 0 before the first `saveProfile`.

## Consequences

- A hostile or corrupt localStorage value can no longer drive verdict
  computation — the store fails safe to defaults (profile) or drops the row
  (goal), the same failure mode as a shape-invalid record.
- The rules live in two layers. They are kept in sync deliberately: the store's
  ranges are documented against `canContinue` and the slider bounds, so a change
  to either is a prompt to revisit this ADR.
- No clamping means no silently-altered user data; an out-of-range record is
  treated as absent, not corrected.
