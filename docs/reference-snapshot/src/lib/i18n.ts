export const dict = {
  brand: "Affordo",
  tagline: "Weigh purchases against your working hours.",
  // onboarding
  onboardingTitle: "Set up your reckoning",
  step: "Step",
  of: "of",
  back: "Back",
  continue: "Continue",
  start: "Start",
  finish: "Finish setup",
  // steps
  stepWelcomeLabel: "Welcome",
  stepIncomeLabel: "Income",
  stepExpensesLabel: "Expenses",
  stepRulesLabel: "Rules",
  welcomeKicker: "Before you buy",
  welcomeHeadline: "Measure any purchase in hours of your life.",
  welcomeBody:
    "Affordo turns your salary into a time budget, then weighs every goal against it. Set your income once, then add a goal any time you're tempted to spend.",
  currency: "Currency",
  netMonthlySalary: "Net monthly salary",
  hoursPerWeek: "Hours per week",
  hoursPerDay: "Hours per day",
  paymentsPerYear: "Payments per year",
  paymentsHint: "Use 14 for Spanish-style extra payments.",
  monthlyExpenses: "Monthly fixed expenses",
  expensesHint: "Rent, groceries, subscriptions, transport, utilities.",
  threshold: "Significance threshold",
  thresholdHint: "Purchases above this % of your monthly income are flagged.",
  currentSavings: "Current savings",
  monthlyContribution: "Extra monthly savings (optional)",
  contributionHint: "Money you consistently set aside on top of expenses.",
  // dashboard
  goalsTitle: "Goals",
  addGoal: "Add goal",
  editGoal: "Edit goal",
  goalName: "Name",
  goalPrice: "Price",
  goalNote: "Note (optional)",
  save: "Save",
  cancel: "Cancel",
  remove: "Remove",
  edit: "Edit",
  empty: "No decisions to reckon with yet.",
  emptyHint: "Add your first goal to see what it costs in hours of your life.",
  // verdict
  verdictAfford: "Afford",
  verdictStretch: "Stretch",
  verdictCut: "Cut to afford",
  verdictCannot: "Cannot",
  daysOfWork: "days of work",
  hoursOfWork: "hours of work",
  pctOfIncome: "of monthly income",
  timeToSave: "Time to save",
  months: "months",
  cutExpenses: "Cut expenses by",
  toReachIn: "to reach it in",
  aboveBudget: "Beyond a reasonable savings plan.",
  payItOff: "You already have savings for this.",
  // snapshot
  hourlyRate: "Time value",
  perHour: "/ hour",
  disposable: "Monthly surplus",
  // settings
  settings: "Settings",
  profile: "Profile",
  resetAll: "Reset everything",
  resetConfirm: "This will erase your profile and all goals. Continue?",
  savedGoals: "Saved goals",
  // footer
  footerLocal: "Record persistent in local-cache",
} as const;

export type TKey = keyof typeof dict;

export function t(key: TKey): string {
  return dict[key];
}
