import type {
  ReferenceGoal,
  ReferenceProfile,
  ReferenceVerdict,
} from "./reference-types";

/**
 * The reference Affordability Verdict engine (ADR 0015/0016/0017).
 *
 * A pure function reproducing the reference semantics verbatim (see
 * docs/affordo-context.md §8). Money is plain currency units as
 * floating-point numbers; there is no rounding in the math — all rounding is
 * presentational. Divide-by-zero is guarded with 0 / Infinity so the result is
 * always well-formed.
 *
 * Introduced additively: the legacy three-way engine in `evaluate.ts` remains
 * until its last consumer migrates in a later slice.
 */
export function evaluate(
  profile: ReferenceProfile,
  goal: ReferenceGoal,
): ReferenceVerdict {
  const {
    salary,
    hoursPerWeek,
    hoursPerDay,
    paymentsPerYear,
    expenses,
    threshold,
    savings,
    monthlyContribution = 0,
  } = profile;
  const { price } = goal;

  const hourlyRate =
    hoursPerWeek > 0 ? (salary * paymentsPerYear) / (52 * hoursPerWeek) : 0;
  const hoursOfWork = hourlyRate > 0 ? price / hourlyRate : Infinity;
  const daysOfWork = hoursPerDay > 0 ? hoursOfWork / hoursPerDay : Infinity;
  const pctOfMonthlyIncome = salary > 0 ? (price / salary) * 100 : Infinity;
  const aboveThreshold = pctOfMonthlyIncome > threshold;
  const monthlyDisposable = salary - expenses + monthlyContribution;
  const remaining = Math.max(0, price - savings);

  const base = {
    hourlyRate,
    hoursOfWork,
    daysOfWork,
    pctOfMonthlyIncome,
    aboveThreshold,
    monthlyDisposable,
    monthsToSave: null,
    cutPct: null,
    cutMonths: null,
  } satisfies Omit<ReferenceVerdict, "kind">;

  // 1. Already affordable from savings.
  if (savings >= price) {
    return { kind: "afford", ...base };
  }

  // 2. Positive monthly surplus.
  if (monthlyDisposable > 0) {
    const monthsToSave = remaining / monthlyDisposable;
    if (monthsToSave <= 12) {
      return { kind: "stretch", ...base, monthsToSave };
    }
    const targetMonthly = remaining / 12;
    const extraNeeded = targetMonthly - monthlyDisposable;
    const maxCut = expenses * 0.5;
    if (extraNeeded <= maxCut) {
      return {
        kind: "cutToAfford",
        ...base,
        cutPct: expenses > 0 ? (extraNeeded / expenses) * 100 : 0,
        cutMonths: 12,
      };
    }
    return { kind: "cannot", ...base };
  }

  // 3. No surplus (zero or negative disposable).
  const targetMonthly = remaining / 12;
  const maxCut = expenses * 0.5;
  if (targetMonthly - monthlyDisposable <= maxCut) {
    return {
      kind: "cutToAfford",
      ...base,
      cutPct:
        expenses > 0 ? ((targetMonthly - monthlyDisposable) / expenses) * 100 : 0,
      cutMonths: 12,
    };
  }
  return { kind: "cannot", ...base };
}
