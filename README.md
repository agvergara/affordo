# Affordo ⏳

**Can I afford this?** — and if not, **when could I?** Affordo answers both for any
purchase and reframes the price as something you actually feel: the **Time Cost**, in
hours and days of your own working life. A €1.200 laptop isn't an abstract number;
it's *three weeks of work*.

It's a privacy-first, client-only web app. You type what you earn and spend — nothing
ever leaves your browser — name a purchase, and Affordo answers in plain language.

---

## The three answers

- **Time Cost** — how many hours / work-days / work-weeks of your life the purchase
  costs, shown in the most readable unit for its size (a house isn't reported as
  18,000 hours). A "work day" is built from **your** contracted hours, not a fixed 8.
- **Affordability Verdict** — **Affordable Now** from your savings, a **Save-Up Date**
  ("about 4 months if you save your surplus"), or **Not Reachable** at your current
  rate — with the monthly shortfall and the expense lever that would change it. No
  ∞, no NaN, no negative dates; always an honest answer.
- **A think-twice Challenge** — when a purchase crosses your **Significance Threshold**
  (default 10% of monthly net income, and you can change the percentage and the
  monthly/annual basis), Affordo challenges you to pause. It challenges the *decision*,
  never the person, and never nudges you toward spending.

Everything past the basics is an **optional** refinement, never asked upfront: itemized
expenses each with their own frequency, income paid in 14 instalments, a custom monthly
contribution, a one-off windfall, and **Saved Goals** you can name and revisit.

---

## Privacy is the point

There's no backend. No accounts, no bank connection, no analytics, no network calls at
all. Your salary and savings live in your browser's `localStorage` and nowhere else —
and the app says so, out loud, because that's the whole pitch. (No at-rest encryption
either: an embedded key on a client-only app is security theater — see
[ADR 0011](docs/adr/0011-plain-versioned-localstorage-no-encryption.md).)

---

## Tech stack

| Piece         | Choice                                   | Why |
|---------------|------------------------------------------|-----|
| Language      | TypeScript 5.5                           | The contracts are the spec; correctness is enforced at compile time |
| UI            | React 18 + Vite 5                        | A form and a few results — a static bundle with instant dev reload |
| Domain logic  | Pure-TypeScript engine, zero UI imports  | The money lives away from the framework: testable in milliseconds, reusable by a future native app |
| Money         | Integer cents, everywhere                | No floating-point drift — €0,10 + €0,20 is exactly €0,30 |
| Persistence   | Versioned `localStorage`, plain JSON     | Client-only, with a `schemaVersion` so future migrations don't hurt |
| Unit tests    | Vitest + Testing Library                 | Near-exhaustive on the engine, thin on the UI |
| E2E           | Playwright                               | Real-browser journeys for the paths that matter |

No runtime dependencies beyond React. Nothing to configure, nothing to sign up for.

---

## Architecture

The whole idea is that the interesting logic — the money, the verdict, the Time Cost —
lives in an **isolated pure-TypeScript engine that never imports React**. The UI
depends on the engine; the engine never depends on the UI. So correctness gets tested
against a single function in milliseconds, and the same engine could power a future
Android app untouched ([ADR 0008](docs/adr/0008-isolated-pure-typescript-engine.md)).

```
        ┌────────────────────────────────────────────────┐
  UI    │  App.tsx  (React)                               │
 src/ui │  format · expenses · storage · goals            │
        └────────────────────────┬───────────────────────┘
                                  │  evaluate(profile, purchase, settings)
        ┌────────────────────────▼───────────────────────┐
 ENGINE │  evaluate(…) → Evaluation                       │
 src/   │  pure TypeScript · money = integer cents        │
 engine │  zero framework imports · types · money         │
        └────────────────────────────────────────────────┘
```

`evaluate(profile, purchase, settings) → Evaluation` is the one seam: give it a
financial profile, a purchase, and settings, and it hands back the Net Hourly Wage,
the Time Cost, the Verdict, and whether the Challenge fires. Derived values (Net Hourly
Wage, Surplus) are computed *inside* — the caller never supplies them.

---

## Getting started

```bash
npm install       # Node 20+
npm run dev       # Vite dev server
```

Open the printed URL, enter your monthly net income and hours, then a price. Amounts use
**European formatting** (`1.234,56` — dot for thousands, comma for cents); the app
reminds you on screen. Currency is a cosmetic €/£/$ picker — no conversion.

```bash
npm run build     # static production bundle → dist/
npm run preview   # serve the built bundle
```

---

## Testing

Three seams, heaviest where the risk is ([ADR 0013](docs/adr/0013-three-layer-testing-e2e-in-v1.md)):

- **Engine (Vitest), near-exhaustive** — every surfaced case of `evaluate`: all three
  verdicts, tiny-but-positive surplus, windfalls, custom contribution, 12/14 payments,
  Significance-Threshold boundaries, the Work-Time Unit ladder, European parsing,
  integer-cents arithmetic. Wrong money would be the worst bug, so coverage is deepest here.
- **E2E (Playwright)** — full journeys through the running app: each answer, saving and
  revisiting Goals, the desktop manual-entry path, unparseable-input recovery.
- **UI components (Testing Library), thin** — the React glue, kept light because the
  logic is proven at seam 1.

```bash
npm test          # Vitest — 88 tests
npm run test:e2e  # Playwright — 11 journeys
npm run typecheck # tsc --noEmit
```

---

## Project layout

```
src/
  engine/     evaluate · types · money   — pure TS, no framework imports
  ui/         App.tsx · format · expenses · storage · goals
  main.tsx    React entry point
e2e/          Playwright journeys
docs/
  prd/        product requirements (frozen, per release)
  adr/        13 architecture decision records
CONTEXT.md    the glossary / ubiquitous language
```

---

## Roadmap

- **v1** — *shipped.* Time Cost, the three-way Verdict, the Significance-Threshold
  Challenge, Saved Goals, hardened European parsing, a personal work day.
- **v1.1** — mobile camera **Price Scan** via on-device OCR (result always editable).
- **v1.2** — cross-goal interaction ("buying X delays Y"); Goals are independent in v1.
- **v2** — variable-income tracking + the Real Hourly Wage refinement; later, durable
  cross-device storage and an Android app reusing the same engine.

---

## Where the rest lives

- [**`CONTEXT.md`**](CONTEXT.md) — the glossary. The vocabulary here (Time Cost,
  Surplus, Save-Up Date, Windfall…) is used verbatim in code, tests, and copy.
- [**`docs/prd/`**](docs/prd) — the product requirements, one frozen PRD per release.
- [**`docs/adr/`**](docs/adr) — the 13 decisions that shaped the build, and the ones
  deliberately deferred.
