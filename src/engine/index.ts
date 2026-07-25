export { evaluate } from "./evaluate";
export { parseAmount, formatAmount } from "./money";
export type { ParsedAmount } from "./money";
export type * from "./types";

// Reference-semantics engine (ADR 0015/0016/0017), introduced additively
// alongside the legacy three-way engine above. Exported under distinct names to
// avoid clobbering the existing `evaluate`/type exports.
export { evaluate as evaluateReference } from "./reference-evaluate";
export type {
  Currency,
  ReferenceGoal,
  ReferenceProfile,
  ReferenceVerdict,
  ReferenceVerdictKind,
} from "./reference-types";
