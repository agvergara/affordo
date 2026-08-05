# Affordo ⏳

**Can I afford this?** — and if not, **when could I?** Affordo answers both for any
purchase and reframes the price as something you actually feel: the **Time Cost**, in
hours and days of your own working life. A €1.200 laptop isn't an abstract number;
it's _three weeks of work_.

It's a privacy-first, client-only web app. You type what you earn and spend — nothing
ever leaves your browser — name a purchase, and Affordo answers in plain language.

---

## The two answers

- **Time Cost** — how many hours and work days of your life the purchase costs. A
  "work day" is built from **your** contracted hours, not a fixed 8.
- **A four-way Verdict** — **Afford** it from savings; **Stretch**, reachable within
  12 months from what you have spare; **Cut to afford**, reachable if you trim
  expenses, with the percentage and the horizon that buys; or **Cannot**, no route
  at the current numbers. No ∞, no NaN, no negative durations.

A purchase above your **Significance Threshold** (default 10% of monthly income,
adjustable) is marked as such on its card.

Income paid in 14 instalments, a custom monthly contribution, and **Saved Goals**
you can name and revisit are all supported; nothing beyond the basics is asked
upfront.

---

## Privacy is the point

There's no backend. No accounts, no bank connection, no analytics, no network calls at
all. Your salary and savings live in your browser's `localStorage` and nowhere else —
and the app says so, out loud, because that's the whole pitch. (No at-rest encryption
either: an embedded key on a client-only app is security theater — see
[ADR 0011](docs/adr/0011-plain-versioned-localstorage-no-encryption.md).)

---

## Tech stack

| Piece        | Choice                                  | Why                                                                                                                                             |
| ------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Language     | TypeScript 5.5                          | The contracts are the spec; correctness is enforced at compile time                                                                             |
| UI           | React 18 + Vite 5                       | A form and a few results — a static bundle with instant dev reload                                                                              |
| Styling      | Tailwind CSS v4 (CSS-first, `@theme`)   | Utility styling that compiles away at build time — no runtime weight ([ADR 0014](docs/adr/0014-tailwind-v4-utility-styling.md))                 |
| Domain logic | Pure-TypeScript engine, zero UI imports | The money lives away from the framework: testable in milliseconds, reusable by a future native app                                              |
| Money        | Float currency units                    | What the reference computes in; the v1 integer-cents model was superseded ([ADR 0017](docs/adr/0017-money-as-floating-point-currency-units.md)) |
| Persistence  | Versioned `localStorage`, plain JSON    | Client-only, with a `schemaVersion` so future migrations don't hurt                                                                             |
| Unit tests   | Vitest + Testing Library                | Near-exhaustive on the engine, thin on the UI                                                                                                   |
| E2E          | Playwright                              | Real-browser journeys for the paths that matter                                                                                                 |

React stays the only _runtime_ dependency — Tailwind is a build-time tool that compiles
to plain CSS and ships no JavaScript. Its config is deliberately minimal (v4's CSS-first
`@theme`, no `tailwind.config.js`), and there's still nothing to sign up for. Fonts are
self-hosted, never loaded from a CDN, so the "no network calls" promise holds.

---

## Architecture

The whole idea is that the interesting logic — the money, the verdict, the Time Cost —
lives in an **isolated pure-TypeScript engine that never imports React**. The UI
depends on the engine; the engine never depends on the UI. So correctness gets tested
against a single function in milliseconds, and the same engine could power a future
Android app untouched ([ADR 0008](docs/adr/0008-isolated-pure-typescript-engine.md)).

```
        ┌────────────────────────────────────────────────┐
  UI    │  Router · wizard · goals · settings  (React)     │
 src/ui │  state/ holds profile · goals · theme            │
        └────────────────────────┬───────────────────────┘
                                  │  evaluateReference(profile, goal)
        ┌────────────────────────▼───────────────────────┐
 ENGINE │  evaluateReference(…) → ReferenceVerdict         │
 src/   │  pure TypeScript · money = float currency units  │
 engine │  zero framework imports · reference-types        │
        └────────────────────────────────────────────────┘
```

`evaluateReference(profile, goal) → ReferenceVerdict` is the one seam: give it a
financial profile and a goal, and it hands back the Net Hourly Wage, the Time Cost in
hours and days, and the four-way verdict. Derived values (Net Hourly Wage, Surplus) are
computed _inside_ — the caller never supplies them.

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

- **Engine (Vitest)** — every case `evaluateReference` surfaces: all four verdicts,
  the 12-month stretch boundary, the expense-cut path, 12/14 payment periods,
  Significance-Threshold boundaries, and the guards against ∞/NaN. Wrong money would
  be the worst bug, so coverage is deepest here.
- **E2E (Playwright)** — journeys through the running app: the onboarding gate,
  saving/editing/removing goals, reset, and the guards no unit test can see — a
  privacy check that no request leaves the origin, and a sweep that every
  interactive target clears 24×24 ([ADR 0022](docs/adr/0022-fidelity-bar-stops-at-the-perceivable.md)).
- **UI components (Testing Library)** — the React glue and the reference's exact
  class strings, since jsdom applies no stylesheet and geometry is otherwise
  invisible to the suite.

**Anything about rendered geometry has to be measured in a browser.** Four separate
PRs shipped a class string byte-identical to the reference and rendered it at the
wrong size, because the reference composes shadcn components whose base classes
survive tailwind-merge and appear in no source. A class-string comparison cannot
see that; `getBoundingClientRect` can.

```bash
npm test          # Vitest — 454 tests
npm run test:e2e  # Playwright — 16 journeys
npm run typecheck # tsc --noEmit
```

---

## Project layout

```
src/
  engine/     reference-evaluate · reference-types  — pure TS, no framework imports
  ui/         Router · OnboardingWizard · GoalsDashboard · SettingsScreen
  state/      profile · goals · theme stores and their providers
  styles/     Tailwind v4 @theme tokens
  main.tsx    React entry point
e2e/          Playwright journeys
docs/
  prd/        product requirements (frozen, per release)
  adr/        22 architecture decision records
CONTEXT.md    the glossary / ubiquitous language
AGENTS.md     working agreements for agents on this repo
```

---

## Status

**v1** shipped, then was **replaced** by a full rebuild to a reference design (PRD
issue #39, closed). The rebuild changed the product, not just the code: the
three-way verdict became four-way, the think-twice Challenge went, and money moved
from integer cents to float currency units. `CONTEXT.md` lists what was retired and
what replaced it; `docs/prd/v1-affordability-calculator.md` is kept as the frozen
record of the app this one replaced.

Known and deliberate: the reference palette fails WCAG AA in four places, and those
failures are reproduced and pinned as expected failures. See
[ADR 0022](docs/adr/0022-fidelity-bar-stops-at-the-perceivable.md) for what may
diverge from the reference and what may not.

---

## Where the rest lives

- [**`CONTEXT.md`**](CONTEXT.md) — the glossary. The vocabulary here (Time Cost,
  Monthly Disposable, Stretch, Cut to afford…) is used verbatim in code, tests and
  copy, and it lists the v1 terms the rebuild retired.
- [**`docs/affordo-context.md`**](docs/affordo-context.md) — the reference
  extraction, and the authority on what the app should look like. Read its coverage
  table first: some sections are exhaustive and some are samples, and **silence in
  it is not evidence about the reference.**
- [**`docs/prd/`**](docs/prd) — frozen PRDs, one per release. v1 describes the app
  this one replaced.
- [**`docs/adr/`**](docs/adr) — the 22 decisions that shaped the build, superseded
  ones kept and marked.
- [**`AGENTS.md`**](AGENTS.md) — how agents are expected to work in this repo.
