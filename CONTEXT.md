# Affordo

A personal-finance app that answers "can I afford this?" for any purchase or
commitment the user chooses (a home, a car, a computer, anything). It gives three
things: an **Affordability Verdict** (afford it now, a Save-Up Date, or not
reachable at the current rate), the **Time Cost** of the purchase expressed in
hours of the user's working life, and a **Challenge** to think twice when a
purchase is significant.

## Language

### The purchase and its cost

**Time Cost**:
How many hours the user has to work to afford a given purchase, derived from the
purchase price and the user's Net Hourly Wage.
_Avoid_: price-in-hours, hourly cost

**Work-Time Units**:
The units Time Cost is displayed in. A "day" means a **work day** built from the
user's own contracted hours/day (not a 24h calendar day). v1 uses an adaptive
ladder — hours → work days → work weeks → work months — choosing the most
readable unit for the magnitude (so a house isn't shown as "18,000 hours").
_Avoid_: calendar days, business days

**Significance Threshold**:
The purchase size above which the app challenges the user to "think twice"
(see the product-voice ADR). Default: 10% of monthly net income. Both the
percentage and the reference period (monthly/annual) are user-customizable.
_Avoid_: limit, cap, alert level

**Challenge**:
The provocative prompt shown when a purchase exceeds the Significance Threshold,
inviting the user to reconsider before spending. Challenges the decision, never
the person, and never nudges toward buying (see product-voice ADR).
_Avoid_: warning, alert, nag, think-twice popup

**Price Capture**:
How the purchase price gets into the app. Device-adaptive: desktop is manual
entry only; mobile web adds an optional Price Scan. Prices are interpreted with
European formatting (decimal comma, dot thousands separator).
_Avoid_: price input

**Price Scan**:
The optional mobile-web camera capture of a price tag (on-device OCR, v1.1) that
fills in the purchase price; the result is always editable. A mode of Price
Capture, never the only path.
_Avoid_: scan, OCR capture

### The user's finances

**Income**:
The user's steady net (take-home) earnings, entered as monthly net pay + typical
hours/week + payments per year (12, 14, etc. — Europe often pays 14), normalized
to a true monthly average. v1 assumes a single steady source; variable earners
enter an approximate yearly mean. Tracking a variable component separately and
sweeping it into Savings when it arrives is deferred to v2.
_Avoid_: salary, earnings, revenue

**Net Hourly Wage**:
Take-home (after-tax) pay divided by contracted hours worked. The canonical
per-hour value of the user's time for v1, derived from Income (monthly net ÷
monthly hours), not typed directly.
_Avoid_: salary rate, hourly rate

**Real Hourly Wage** (deferred, post-v1):
Net take-home pay minus work-related expenses, divided by all hours the job
consumes (contracted hours plus commute, prep, and unwind time). A future
refinement of Net Hourly Wage; not built in v1.

**Expenses**:
The user's recurring outgoings, subtracted from Income to give Surplus. Entered
first as a single estimated monthly figure, then optionally refined into itemized
line items, each with a frequency (weekly/monthly/quarterly/annual) normalized to
a monthly total.
_Avoid_: costs, outgoings, bills, spending

**Surplus**:
Income minus Expenses over a period — the amount the user has free to put toward
a purchase. Drives the Save-Up Date.
_Avoid_: disposable income, leftover, savings rate

**Savings**:
The user's current money available toward purchases, optionally boosted by a
Windfall.
_Avoid_: balance, cash, funds

**Windfall**:
An optional one-off lump (bonus, investment gain, lottery, found cash) the user
adds to Savings to close the gap faster. Distinct from the recurring
Contribution; always optional. A large enough Windfall can flip a Not Reachable
goal to Affordable Now.
_Avoid_: bonus, lump sum

**Contribution**:
How much of monthly Surplus goes toward a goal. Defaults to 100% of Surplus
("if you save everything left over…"); the user may optionally set a smaller
custom monthly amount.
_Avoid_: monthly saving, allocation

### The affordability answer

**Affordability Verdict**:
The answer to "can you actually afford this right now?", computed from the user's
Income and Savings. Has three outcomes in v1: Affordable Now, a Save-Up Date, or
Not Reachable. The engine never emits ∞/NaN/negative durations.
_Avoid_: affordability check, can-afford flag

**Affordable Now**:
The Affordability Verdict outcome when current Savings already cover the purchase
price.
_Avoid_: can afford, in budget

**Save-Up Date**:
The Affordability Verdict outcome (and the answer to "when can I afford this?")
giving the projected date on which current Savings plus accumulated Contributions
first reach the purchase price. v1 assumptions: full Surplus by default, no
interest/investment growth, and each Goal projected independently (see ADR 0007).
_Avoid_: target date, goal date

**Not Reachable**:
The Affordability Verdict outcome when monthly Surplus is zero or negative: there
is no save-up path at the current Income/Expenses. Instead of a date, the app
shows the monthly shortfall and gestures at the expense lever ("trimming €X/month
would put this in reach"). A large enough Windfall can still flip it to Affordable
Now.
_Avoid_: unaffordable, impossible, denied

### Saved state

**Goal**:
A purchase the user has saved with a name (e.g. "MacBook", "Down payment"),
retaining its price, Affordability Verdict, and Save-Up Date so it can be
reopened. Saved locally. v1 goals are independent; cross-goal interaction
("buying X delays Y") is deferred to v1.2.
_Avoid_: target, wishlist item, plan

### Presentation

**Localization** (v1 scope):
Currency defaults to € with a basic symbol picker (€ / £ / $) — cosmetic only,
no FX or conversion. Numbers use European formatting throughout, and the UI must
**advise the user of this convention** (e.g. `1.234,56`) so inputs aren't
misread. UI copy is English. No full i18n (translated copy / per-locale number
formats) in v1.
_Avoid_: i18n, currency conversion

---

## Where the rest lives

This file is the glossary only. Architectural and product decisions are recorded
as ADRs in `docs/adr/` (0001–0014). The v1 product spec and its work breakdown
live in the issue tracker: PRD issue #1 and its sub-issues #2–#7.
