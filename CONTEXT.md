# Affordo

A personal-finance app that answers "can I afford this?" for any purchase the
user names. It gives two things: the **Time Cost** of the purchase in hours and
work days of the user's own life, and a four-way **Verdict** — Afford, Stretch,
Cut to afford, or Cannot.

It is a client-only rebuild of a reference design, reproduced to the fidelity
bar in PRD issue #39 as amended by [ADR 0022](docs/adr/0022-fidelity-bar-stops-at-the-perceivable.md).
When this glossary and the reference disagree, the reference wins and this file
is the thing that is wrong.

## Language

Every term below is in the shipped code. Terms the rebuild retired are listed at
the end rather than deleted, so that a name met in an old issue, ADR or commit
can still be looked up.

### The purchase and its cost

**Time Cost**:
What a purchase costs in the user's working life, computed from the price and
the Net Hourly Wage. The engine returns it twice — `hoursOfWork` and
`daysOfWork` — and the UI shows both.
_Avoid_: price-in-hours, hourly cost

**Significance Threshold**:
The share of monthly income above which a purchase is marked significant.
Default 10%; user-adjustable. Surfaces as `aboveThreshold` on the verdict and as
a meter on the goal card.
_Avoid_: limit, cap, alert level

### The user's finances

**Profile**:
The nine numbers the whole app derives from: `currency`, `salary` (monthly
take-home), `hoursPerWeek`, `hoursPerDay`, `paymentsPerYear`, `expenses`,
`threshold`, `savings`, `monthlyContribution`. Entered once through the wizard,
editable on `/settings`, persisted to `localStorage`.
_Avoid_: settings, user data

**Net Hourly Wage**:
The per-hour value of the user's time — `hourlyRate` on the verdict. Derived
from salary, hours and pay periods per year; never typed directly. A profile
paid in 14 instalments has a higher hourly rate than the same monthly figure
paid in 12.
_Avoid_: salary rate, hourly rate (as a typed input)

**Monthly Disposable**:
`salary − expenses + monthlyContribution`. What the user has free each month to
put toward a purchase, and the denominator of Months to Save. Shown on the
dashboard as "Monthly surplus".
_Avoid_: surplus (in code), leftover, savings rate

**Contribution**:
An optional extra monthly amount on top of the ordinary disposable figure.
Absent means zero.
_Avoid_: allocation

### The affordability answer

**Verdict**:
The answer to "can you afford this?", as one of four kinds. This is the reference
model and it is **not** a severity ladder — `cutToAfford` is not "worse than"
`stretch`, it is a different route to the same purchase.
_Avoid_: affordability check, can-afford flag

**Afford** (`afford`):
Current savings already cover the price.
_Avoid_: affordable now, in budget

**Stretch** (`stretch`):
Savings fall short, but the monthly disposable figure closes the gap within
**12 months**. Carries `monthsToSave`.
_Avoid_: save-up date — the engine reports a duration in months, never a date

**Cut to afford** (`cutToAfford`):
Not reachable in 12 months at the current rate, but reachable if expenses are
cut. Carries `cutPct` (the percentage of expenses to cut) and `cutMonths` (the
horizon it buys).
_Avoid_: budget cut, austerity

**Cannot** (`cannot`):
No route within the model's horizon, even with the maximum expense cut.
_Avoid_: unaffordable, impossible, denied

### Saved state

**Goal**:
A saved purchase: `id`, `name`, `price`, `note` (a string, empty when unused), `createdAt`. The
verdict is **recomputed on render**, never stored — editing the profile
re-verdicts every goal at once. Goals are independent; the model does not
account for funding two at the same time (see [ADR 0007](docs/adr/0007-save-up-date-projection-assumptions.md),
whose points 2 and 3 still describe the shipped engine).
_Avoid_: target, wishlist item, plan

### Presentation

**Currency**:
`"EUR" | "USD" | "GBP"` — a cosmetic picker. No FX, no conversion. Formatting
follows the chosen currency's locale, so amounts render `1.234,56 €` under EUR
and `$1,234.56` under USD.
_Avoid_: i18n, currency conversion

**Theme**:
Light or dark, chosen by the user or followed from the OS until they choose.
Applied as a `.dark` class on `<html>` ([ADR 0021](docs/adr/0021-dark-mode-in-scope.md)).
_Avoid_: colour scheme, appearance

---

## Retired terms

These were v1 vocabulary. They appear in closed issues, superseded ADRs and the
frozen v1 PRD, and **nowhere in shipped source**. Listed so an old reference can
be resolved, not because anything still implements them.

| term                                              | what happened                                                                                                                                                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Challenge**                                     | The think-twice prompt. The reference has no equivalent; the Significance Threshold survives as a meter and an `aboveThreshold` flag.                                                                                                      |
| **Affordable Now / Save-Up Date / Not Reachable** | The v1 three-way verdict, replaced by the reference's four-way model ([ADR 0016](docs/adr/0016-reference-four-way-affordability-verdict.md)). `Save-Up Date` is the sharpest change: the engine reports **months**, never a calendar date. |
| **Work-Time Units**                               | The adaptive hours → days → weeks → months ladder. The reference shows hours and work days only.                                                                                                                                           |
| **Windfall**                                      | A one-off lump added to savings. Never built; ADR 0007's point 1 mentions it and nothing implements it.                                                                                                                                    |
| **Price Capture / Price Scan**                    | Device-adaptive price entry and mobile OCR. Never built.                                                                                                                                                                                   |
| **Real Hourly Wage**                              | Net pay minus work costs over all hours the job consumes. Deferred in [ADR 0002](docs/adr/0002-net-hourly-wage-for-time-cost.md) and never revisited; the reference is net-based too, so the decision survives its engine.                 |
| **Itemized expenses**                             | Per-line expenses each with a frequency. The shipped profile has a single monthly `expenses` figure.                                                                                                                                       |
| **Integer cents**                                 | The v1 money model ([ADR 0012](docs/adr/0012-money-as-integer-cents-round-date-up.md)), replaced by float currency units ([ADR 0017](docs/adr/0017-money-as-floating-point-currency-units.md)).                                            |

---

## Where the rest lives

- **Decisions** — `docs/adr/`, 22 records. Superseded ones are kept and marked.
- **The reference extraction** — `docs/affordo-context.md`. The authority on what
  the app should look like, including which of its own sections are exhaustive.
- **Frozen product specs** — `docs/prd/`. The v1 PRD describes the app this one
  replaced; read it as history.
- **Working agreements for agents** — `AGENTS.md`.
