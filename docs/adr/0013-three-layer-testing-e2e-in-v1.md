# Three-layer testing, with E2E included in v1

Testing is a first-class v1 requirement, not a fast-follow. Three layers:

1. **Engine (Vitest) — near-exhaustive.** The engine gives financial advice, so
   bugs are wrong-money bugs. Table-driven unit tests cover every surfaced edge
   case: zero/negative Surplus (Not Reachable), tiny-but-positive Surplus,
   Windfalls, Significance Threshold boundaries, payments-per-year normalization,
   European number parsing, integer-cents rounding, round-date-up.
2. **UI (React Testing Library) — pragmatic.** Critical progressive-disclosure
   stages and device-adaptive Price Capture; not exhaustive.
3. **E2E (Playwright) — in v1.** Full user journeys through the browser,
   including the mobile/desktop split. Explicitly in scope for v1 (not deferred).

Rationale: the product's whole value is trustworthy numbers; shipping without
end-to-end coverage would undermine that trust. Do not deprioritize E2E under
schedule pressure — its inclusion in v1 is a deliberate decision.
