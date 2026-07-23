# The affordability engine is an isolated, pure-TypeScript module

All domain logic — Net Hourly Wage, Time Cost, Surplus, Affordability Verdict,
Save-Up Date — lives in a framework-agnostic TypeScript module (e.g.
`packages/engine` or `src/engine`) of pure functions: inputs → results. It has
**zero UI or framework imports** (no React, no DOM, no browser globals). This is
a hard rule, not a guideline.

Rationale:
- **Testability** — the math is unit-tested in isolation, without a browser or
  rendering harness.
- **Reuse** — a future Android app (React Native or native Kotlin) reuses the
  engine untouched, and it makes the UI framework choice reversible: swapping
  React for anything else never touches the math.

Do not let framework types, hooks, or DOM access leak into the engine. UI code
depends on the engine, never the reverse.
