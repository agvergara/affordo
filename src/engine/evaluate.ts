import type {
  Evaluation,
  Income,
  Profile,
  Purchase,
  Settings,
  TimeCost,
} from "./types";

const MONTHS_PER_YEAR = 12;
const WEEKS_PER_YEAR = 52;

/** Contracted hours in an average month, from the user's weekly hours. */
function hoursPerMonth(hoursPerWeek: number): number {
  return (hoursPerWeek * WEEKS_PER_YEAR) / MONTHS_PER_YEAR;
}

/** True monthly average take-home, normalizing pay periods (e.g. 14 → ×14/12). */
function normalizedMonthlyNet(income: Income): number {
  return (income.monthlyNet * income.paymentsPerYear) / MONTHS_PER_YEAR;
}

/** Express work-hours in the most readable Work-Time Unit for their magnitude. */
function toDisplay(hours: number, profile: Profile): TimeCost["display"] {
  const { hoursPerDay } = profile;
  const perWeek = profile.income.hoursPerWeek;
  const perMonth = hoursPerMonth(perWeek);

  if (hours < hoursPerDay) return { value: hours, unit: "hours" };
  if (hours < perWeek) return { value: hours / hoursPerDay, unit: "work-days" };
  if (hours < perMonth) return { value: hours / perWeek, unit: "work-weeks" };
  return { value: hours / perMonth, unit: "work-months" };
}

export function evaluate(
  profile: Profile,
  purchase: Purchase,
  _settings: Settings,
): Evaluation {
  const monthlyNet = normalizedMonthlyNet(profile.income);
  const monthlyHours = hoursPerMonth(profile.income.hoursPerWeek);

  const hours = (purchase.price * monthlyHours) / monthlyNet;
  const netHourlyWage = Math.round(monthlyNet / monthlyHours);

  return {
    netHourlyWage,
    timeCost: { hours, display: toDisplay(hours, profile) },
  };
}
