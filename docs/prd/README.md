# Product Requirements

One PRD per release. Each is the record of what a version promised — the problem,
the user stories, the scope lines — kept even after it ships so the "why" doesn't
only live in a closed issue.

- [**v1 — Affordability calculator**](v1-affordability-calculator.md) — the Time
  Cost, the three-way Affordability Verdict, the Significance-Threshold Challenge,
  and Saved Goals. Shipped, then **replaced**.
- [**v1.1 — Comparison**](v1.1-comparison.md) — cross-goal contention: a Goal may
  carry a Share of the Monthly Disposable, and a Comparison screen reports what
  each goal costs the others in months. Issue #153, **shipped**.

**v1 is history, not the current product.** The parity rebuild (PRD issue #39,
closed) rebuilt the app against a reference design and changed what it does: the
three-way verdict became four-way (Afford / Stretch / Cut to afford / Cannot), the
Challenge went, and money moved from integer cents to float currency units. Read
the v1 PRD for what was promised and why — not for what ships.

That rebuild's PRD lives in the issue tracker rather than here, because it was
worked as a tree of 35 sub-issues. `CONTEXT.md` carries the vocabulary it retired,
and `docs/affordo-context.md` is the reference extraction it was built against.

The v1.1/v1.2/v2 roadmap the v1 PRD sketches was **not** carried into the rebuild
wholesale, and the version numbers no longer line up with it:

- **Cross-goal interaction** — the v1 PRD's v1.2 — shipped as **v1.1** above,
  rewritten against the rebuilt four-way engine rather than the three-way one
  the v1 PRD assumed.
- **Camera Price Scan** — the v1 PRD's v1.1 — is deferred indefinitely, pending
  an Android app that may never happen. [ADR 0005](../adr/0005-on-device-ocr-price-scan-v1.1.md)
  stands but nothing is scheduled against it.
- **Variable-income tracking and the Real Hourly Wage** — the v1 PRD's v2 —
  remain unplanned.
