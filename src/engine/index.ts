/**
 * The engine's public surface.
 *
 * Only the reference-semantics engine remains (ADR 0015/0016/0017). The legacy
 * three-way engine it was "introduced additively alongside" — `evaluate.ts`,
 * `money.ts` and `types.ts` — was retired in #119, once nothing imported any of
 * its exports; #114 had already deleted the UI that consumed them.
 *
 * The names keep their `Reference` prefix rather than being renamed on the way
 * out. Renaming is a wide, mechanical diff across every consumer, and the prefix
 * still says something true: these are the reference app's semantics, not a
 * design of ours.
 */
export { evaluate as evaluateReference } from "./reference-evaluate";
export type {
  Currency,
  ReferenceGoal,
  ReferenceProfile,
  ReferenceVerdict,
  ReferenceVerdictKind,
} from "./reference-types";

/**
 * The Comparison seam (ADR 0024, issue #155) — the second and last entry point.
 *
 * It sits beside `evaluateReference` rather than wrapping it: the two answer
 * different questions, and a Comparison must never be able to change what a
 * goal's own Verdict says.
 */
export { compare, type ComparableGoal } from "./comparison";
export type { Comparison, ComparisonRow } from "./comparison-types";
