import type { Profile, Goal } from "./affordo-types";

export type VerdictKind = "afford" | "stretch" | "cutToAfford" | "cannot";

export type Verdict = {
  kind: VerdictKind;
  hourlyRate: number;
  hoursOfWork: number;
  daysOfWork: number;
  pctOfMonthlyIncome: number;
  aboveThreshold: boolean;
  monthlyDisposable: number;
  monthsToSave: number | null;
  cutPct: number | null;
  cutMonths: number | null;
};

export function evaluate(profile: Profile, goal: Goal): Verdict {
  const { salary, hoursPerWeek, hoursPerDay, paymentsPerYear, expenses, threshold, savings, monthlyContribution } = profile;
  const price = goal.price;

  const yearlyIncome = salary * paymentsPerYear;
  const hourlyRate = hoursPerWeek > 0 ? yearlyIncome / (52 * hoursPerWeek) : 0;
  const hoursOfWork = hourlyRate > 0 ? price / hourlyRate : Infinity;
  const daysOfWork = hoursPerDay > 0 ? hoursOfWork / hoursPerDay : Infinity;
  const pctOfMonthlyIncome = salary > 0 ? (price / salary) * 100 : Infinity;
  const aboveThreshold = pctOfMonthlyIncome > threshold;

  const monthlyDisposable = salary - expenses + monthlyContribution;
  const remaining = Math.max(0, price - savings);

  let kind: VerdictKind;
  let monthsToSave: number | null = null;
  let cutPct: number | null = null;
  let cutMonths: number | null = null;

  if (savings >= price) {
    kind = "afford";
  } else if (monthlyDisposable > 0) {
    monthsToSave = remaining / monthlyDisposable;
    if (monthsToSave <= 12) {
      kind = "stretch";
    } else {
      // try cutting expenses up to 50%
      const targetMonthly = remaining / 12;
      const extraNeeded = targetMonthly - monthlyDisposable;
      const maxCut = expenses * 0.5;
      if (extraNeeded <= maxCut) {
        cutPct = expenses > 0 ? (extraNeeded / expenses) * 100 : 0;
        cutMonths = 12;
        kind = "cutToAfford";
      } else {
        kind = "cannot";
      }
    }
  } else {
    // no surplus — need to cut
    const targetMonthly = remaining / 12;
    const maxCut = expenses * 0.5;
    if (targetMonthly - monthlyDisposable <= maxCut) {
      cutPct = expenses > 0 ? ((targetMonthly - monthlyDisposable) / expenses) * 100 : 0;
      cutMonths = 12;
      kind = "cutToAfford";
    } else {
      kind = "cannot";
    }
  }

  return {
    kind,
    hourlyRate,
    hoursOfWork,
    daysOfWork,
    pctOfMonthlyIncome,
    aboveThreshold,
    monthlyDisposable,
    monthsToSave,
    cutPct,
    cutMonths,
  };
}
