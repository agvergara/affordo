import type {
  Challenge,
  Evaluation,
  Income,
  Profile,
  Purchase,
  Settings,
  SignificanceThreshold,
  TimeCost,
  WorkTimeUnit,
} from "./types";

const MONTHS_PER_YEAR = 12;
const WEEKS_PER_YEAR = 52;

/** Default Significance Threshold: 10% of monthly net income (see CONTEXT.md, ADR 0010). */
const DEFAULT_THRESHOLD: SignificanceThreshold = { percent: 10, basis: "monthly" };

/** Contracted hours in an average month, from the user's weekly hours. */
function hoursPerMonth(hoursPerWeek: number): number {
  return (hoursPerWeek * WEEKS_PER_YEAR) / MONTHS_PER_YEAR;
}

/** True monthly average take-home, normalizing pay periods (e.g. 14 → ×14/12). */
function normalizedMonthlyNet(income: Income): number {
  return (income.monthlyNet * income.paymentsPerYear) / MONTHS_PER_YEAR;
}

/** Round a display figure per ADR 0012: hours to 1 decimal, larger units to the nearest half. */
function roundForUnit(value: number, unit: WorkTimeUnit): number {
  // Nearest half is exact in binary; one decimal via toFixed avoids float artifacts.
  if (unit === "hours") return Number(value.toFixed(1));
  return Math.round(value * 2) / 2;
}

/** Express work-hours in the most readable Work-Time Unit for their magnitude. */
function toDisplay(hours: number, profile: Profile): TimeCost["display"] {
  const { hoursPerDay } = profile;
  const perWeek = profile.income.hoursPerWeek;
  const perMonth = hoursPerMonth(perWeek);

  let value: number;
  let unit: WorkTimeUnit;
  if (hours < hoursPerDay) [value, unit] = [hours, "hours"];
  else if (hours < perWeek) [value, unit] = [hours / hoursPerDay, "work-days"];
  else if (hours < perMonth) [value, unit] = [hours / perWeek, "work-weeks"];
  else [value, unit] = [hours / perMonth, "work-months"];

  return { value: roundForUnit(value, unit), unit };
}

/** The three-way Affordability Verdict (ADR 0007). Never emits ∞/NaN/negative. */
function affordabilityVerdict(
  profile: Profile,
  purchase: Purchase,
  monthlyNet: number,
): Evaluation["verdict"] {
  if (profile.savings >= purchase.price) return { kind: "affordable-now" };

  const surplus = monthlyNet - profile.monthlyExpenses;
  if (surplus <= 0) {
    return {
      kind: "not-reachable",
      // Round to whole cents: monthlyNet is fractional when paymentsPerYear != 12.
      monthlyShortfall: Math.round(profile.monthlyExpenses - monthlyNet),
    };
  }

  const remaining = purchase.price - profile.savings;
  const contribution =
    profile.monthlyContribution != null && profile.monthlyContribution > 0
      ? Math.min(profile.monthlyContribution, surplus)
      : surplus;
  return { kind: "save-up", months: Math.ceil(remaining / contribution) };
}

/**
 * The Significance-Threshold Challenge (ADR 0010): challenge a purchase whose
 * price strictly exceeds the threshold share of the user's income.
 */
function significanceChallenge(
  purchase: Purchase,
  monthlyNet: number,
  threshold: SignificanceThreshold,
): Challenge {
  const referenceIncome =
    threshold.basis === "annual" ? monthlyNet * MONTHS_PER_YEAR : monthlyNet;
  const amount = Math.round((referenceIncome * threshold.percent) / 100);
  return { triggered: purchase.price > amount, threshold: amount };
}

export function evaluate(
  profile: Profile,
  purchase: Purchase,
  settings: Settings,
): Evaluation {
  const monthlyNet = normalizedMonthlyNet(profile.income);
  const monthlyHours = hoursPerMonth(profile.income.hoursPerWeek);

  const hours = (purchase.price * monthlyHours) / monthlyNet;
  const netHourlyWage = Math.round(monthlyNet / monthlyHours);

  const verdict = affordabilityVerdict(profile, purchase, monthlyNet);
  const challenge = significanceChallenge(
    purchase,
    monthlyNet,
    settings.significanceThreshold ?? DEFAULT_THRESHOLD,
  );

  return {
    netHourlyWage,
    timeCost: { hours, display: toDisplay(hours, profile) },
    verdict,
    challenge,
  };
}
