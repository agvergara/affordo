import { useEffect, useState } from "react";
import { evaluate, formatAmount, parseAmount } from "../engine";
import type { ParsedAmount, Settings, ThresholdBasis } from "../engine";
import {
  formatChallenge,
  formatMoney,
  formatTimeCost,
  formatVerdict,
} from "./format";
import {
  monthlyExpensesTotal,
  type ExpenseItem,
  type ExpenseRow,
  type Frequency,
} from "./expenses";
import { loadProfile, saveProfile } from "./storage";
import { loadGoals, saveGoals, type Goal } from "./goals";
import { MoneyField } from "./MoneyField";
import { Disclosure } from "./Disclosure";
import { Reveal } from "./Reveal";

const CURRENCIES: Settings["currency"][] = ["EUR", "GBP", "USD"];
const PAYMENT_PERIODS = [12, 14];
const FREQUENCIES: Frequency[] = ["weekly", "monthly", "quarterly", "annual"];
const THRESHOLD_BASES: ThresholdBasis[] = ["monthly", "annual"];

/** Cents from a parsed field, blank-as-zero: empty/unparseable/negative → 0. */
function optionalCents(parsed: ParsedAmount): number {
  return parsed.ok ? Math.max(0, parsed.cents) : 0;
}

function rowToItem(row: ExpenseRow): ExpenseItem {
  return {
    label: row.label,
    amount: optionalCents(parseAmount(row.amount)),
    frequency: row.frequency,
  };
}

export function App() {
  const saved = loadProfile();
  const [price, setPrice] = useState("");
  const [income, setIncome] = useState(saved?.income ?? "");
  const [savings, setSavings] = useState(saved?.savings ?? "");
  const [windfall, setWindfall] = useState(saved?.windfall ?? "");
  const [contribution, setContribution] = useState(saved?.contribution ?? "");
  const [expenses, setExpenses] = useState(saved?.monthlyExpenses ?? "");
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>(
    saved?.expenseRows ?? [],
  );
  const [paymentsPerYear, setPaymentsPerYear] = useState(
    saved?.paymentsPerYear ?? 12,
  );
  const [hoursPerWeek, setHoursPerWeek] = useState(
    String(saved?.hoursPerWeek ?? 40),
  );
  const [hoursPerDay, setHoursPerDay] = useState(
    String(saved?.hoursPerDay ?? 8),
  );
  const [currency, setCurrency] = useState<Settings["currency"]>(
    saved?.currency ?? "EUR",
  );
  const [thresholdPercent, setThresholdPercent] = useState(
    String(saved?.thresholdPercent ?? 10),
  );
  const [thresholdBasis, setThresholdBasis] = useState<ThresholdBasis>(
    saved?.thresholdBasis ?? "monthly",
  );
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals());
  const [goalName, setGoalName] = useState("");

  useEffect(() => saveGoals(goals), [goals]);

  useEffect(() => {
    saveProfile({
      income,
      savings,
      windfall,
      contribution,
      monthlyExpenses: expenses,
      expenseRows,
      paymentsPerYear,
      hoursPerWeek: hoursValid ? hoursPerWeekNum : 40,
      hoursPerDay: hoursPerDayForCalc,
      currency,
      thresholdPercent: Number.isFinite(thresholdPercentNum)
        ? thresholdPercentNum
        : 10,
      thresholdBasis,
    });
  }, [
    income,
    savings,
    windfall,
    contribution,
    expenses,
    expenseRows,
    paymentsPerYear,
    hoursPerWeek,
    hoursPerDay,
    currency,
    thresholdPercent,
    thresholdBasis,
  ]);

  const parsedIncome = parseAmount(income);
  const parsedPrice = parseAmount(price);
  const parsedSavings = parseAmount(savings);
  const parsedWindfall = parseAmount(windfall);
  const parsedContribution = parseAmount(contribution);
  const parsedExpenses = parseAmount(expenses);
  const customContribution =
    parsedContribution.ok && parsedContribution.cents > 0
      ? parsedContribution.cents
      : undefined;
  const incomeValid = parsedIncome.ok && parsedIncome.cents > 0;
  // Number("") is 0, so a cleared field reads as invalid (no wage) rather than NaN.
  const hoursPerWeekNum = Number(hoursPerWeek);
  const hoursValid = Number.isFinite(hoursPerWeekNum) && hoursPerWeekNum > 0;
  const canEvaluate = incomeValid && hoursValid;
  // Hours per day only shapes the Work-Time Unit ladder, so a cleared/invalid
  // value falls back to 8 rather than blocking evaluation; a day can't exceed
  // 24 real hours, so bound it there.
  const hoursPerDayNum = Number(hoursPerDay);
  const hoursPerDayForCalc =
    Number.isFinite(hoursPerDayNum) && hoursPerDayNum > 0
      ? Math.min(24, hoursPerDayNum)
      : 8;
  // A cleared threshold falls back to the 10% default; a deliberate "0" is kept
  // (0% means "never challenge", so we must not collapse it into the default).
  const thresholdPercentNum =
    thresholdPercent.trim() === "" ? 10 : Number(thresholdPercent);
  const priceEntered = parsedPrice.ok && parsedPrice.cents > 0;

  // Itemized expenses replace the single estimate only once a real amount is
  // entered — an empty, mid-edit row must not zero out the estimate.
  const items = expenseRows.map(rowToItem).filter((item) => item.amount > 0);
  const itemized = items.length > 0;
  const monthlyExpenses = itemized
    ? monthlyExpensesTotal(items)
    : optionalCents(parsedExpenses);

  const updateRow = (index: number, patch: Partial<ExpenseRow>) =>
    setExpenseRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  const removeRow = (index: number) =>
    setExpenseRows((rows) => rows.filter((_, i) => i !== index));

  const removeGoal = (id: string) =>
    setGoals((gs) => gs.filter((g) => g.id !== id));

  const evaluation = canEvaluate
    ? evaluate(
        {
          income: {
            monthlyNet: parsedIncome.ok ? parsedIncome.cents : 0,
            hoursPerWeek: hoursPerWeekNum,
            paymentsPerYear,
          },
          hoursPerDay: hoursPerDayForCalc,
          savings: optionalCents(parsedSavings) + optionalCents(parsedWindfall),
          monthlyExpenses,
          monthlyContribution: customContribution,
        },
        { price: priceEntered ? parsedPrice.cents : 0 },
        {
          currency,
          significanceThreshold: {
            percent: Number.isFinite(thresholdPercentNum)
              ? thresholdPercentNum
              : 10,
            basis: thresholdBasis,
          },
        },
      )
    : null;

  const canSaveGoal =
    evaluation != null && priceEntered && goalName.trim() !== "";
  const saveGoal = () => {
    if (!evaluation || !priceEntered || !parsedPrice.ok) return;
    setGoals((gs) => [
      ...gs,
      {
        id: crypto.randomUUID(),
        name: goalName.trim(),
        price: parsedPrice.cents,
        verdict: evaluation.verdict,
      },
    ]);
    setGoalName("");
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
        <header className="mb-8 border-b border-border pb-6">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="font-display text-4xl font-semibold tracking-tight">
              Affordo
            </h1>
            <div className="flex shrink-0 items-center gap-2">
              <label htmlFor="currency" className="!mt-0">
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value as Settings["currency"])
                }
                className="!mt-0 w-auto"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="mt-3 text-sm text-stone">
            Your data is private — it never leaves your browser.
          </p>
          <p className="mt-1 text-sm text-stone">
            Amounts use European formatting: 1.234,56 (dot for thousands, comma
            for cents).
          </p>
        </header>

        <main className="pb-12">
          <MoneyField
            id="income"
            label="Monthly net income"
            value={income}
            onChange={setIncome}
            errorTestId="income-error"
          />

          <label htmlFor="hours">Hours per week</label>
          <input
            id="hours"
            type="number"
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(e.target.value)}
          />

          <Disclosure summary="Refine income">
            <label htmlFor="hours-per-day">Hours per day</label>
            <input
              id="hours-per-day"
              type="number"
              min="1"
              max="24"
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(e.target.value)}
            />

            <label htmlFor="payments">Payments per year</label>
            <select
              id="payments"
              value={paymentsPerYear}
              onChange={(e) => setPaymentsPerYear(Number(e.target.value))}
            >
              {PAYMENT_PERIODS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Disclosure>

          <label htmlFor="threshold-percent">Significance threshold (%)</label>
          <input
            id="threshold-percent"
            type="number"
            value={thresholdPercent}
            onChange={(e) => setThresholdPercent(e.target.value)}
          />

          <label htmlFor="threshold-basis">Reference period</label>
          <select
            id="threshold-basis"
            value={thresholdBasis}
            onChange={(e) =>
              setThresholdBasis(e.target.value as ThresholdBasis)
            }
          >
            {THRESHOLD_BASES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <MoneyField
            id="price"
            label="Price"
            value={price}
            onChange={setPrice}
            errorTestId="price-error"
          />

          <MoneyField
            id="savings"
            label="Current savings"
            value={savings}
            onChange={setSavings}
            errorTestId="savings-error"
          />

          <MoneyField
            id="windfall"
            label="Windfall (one-off, optional)"
            value={windfall}
            onChange={setWindfall}
            errorTestId="windfall-error"
          />

          <MoneyField
            id="contribution"
            label="Monthly contribution (optional)"
            value={contribution}
            onChange={setContribution}
            errorTestId="contribution-error"
          />

          <MoneyField
            id="expenses"
            label="Monthly expenses"
            value={expenses}
            onChange={setExpenses}
            errorTestId="expenses-error"
          />

          <fieldset>
            <legend>Break down expenses (optional)</legend>
            {expenseRows.map((row, i) => (
              <div key={i}>
                <input
                  aria-label="Expense amount"
                  value={row.amount}
                  onChange={(e) => updateRow(i, { amount: e.target.value })}
                />
                <select
                  aria-label="Expense frequency"
                  value={row.frequency}
                  onChange={(e) =>
                    updateRow(i, { frequency: e.target.value as Frequency })
                  }
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => removeRow(i)}>
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setExpenseRows((rows) => [
                  ...rows,
                  { label: "", amount: "", frequency: "monthly" },
                ])
              }
            >
              Add expense item
            </button>
            {itemized && (
              <p data-testid="monthly-expenses-total">
                Monthly expenses: {formatMoney(monthlyExpenses, currency)}
              </p>
            )}
          </fieldset>

          {evaluation && (
            <p data-testid="hourly-wage" className="mt-6 text-sm text-stone">
              Your time is worth{" "}
              {formatMoney(evaluation.netHourlyWage, currency)} per hour.
            </p>
          )}

          {evaluation && priceEntered && (
            <Reveal>
              <div
                data-testid="time-cost"
                className="mt-3 rounded-xl border border-border bg-card p-6"
              >
                <p
                  data-testid="time-cost-headline"
                  className="font-display text-2xl leading-snug"
                >
                  That&apos;s{" "}
                  <span className="text-accent">
                    {formatTimeCost(
                      evaluation.timeCost.display.value,
                      evaluation.timeCost.display.unit,
                    )}
                  </span>{" "}
                  of your working life.
                </p>
                <p className="mt-2 text-sm text-stone">
                  {formatMoney(parsedPrice.cents, currency)} ·{" "}
                  {/* Raw work-hours at the engine's 1-decimal precision (ADR
                      0012), via the same formatter as the headline — so a small
                      purchase reads "0.4 hours", never a contradictory "0 hours". */}
                  {formatTimeCost(
                    Number(evaluation.timeCost.hours.toFixed(1)),
                    "hours",
                  )}
                </p>
              </div>
            </Reveal>
          )}

          {evaluation && priceEntered && evaluation.challenge.triggered && (
            <p
              data-testid="challenge"
              className="mt-3 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm"
            >
              {formatChallenge(
                evaluation.timeCost.display.value,
                evaluation.timeCost.display.unit,
              )}
            </p>
          )}

          {evaluation && priceEntered && (
            <p
              data-testid="verdict"
              className="mt-3 rounded-xl border border-border bg-card p-4"
            >
              {formatVerdict(evaluation.verdict, currency)}
            </p>
          )}

          {evaluation && priceEntered && (
            <div>
              <label htmlFor="goal-name">Goal name</label>
              <input
                id="goal-name"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
              />
              <button type="button" onClick={saveGoal} disabled={!canSaveGoal}>
                Save as goal
              </button>
            </div>
          )}

          {goals.length > 0 && (
            <section data-testid="goals">
              <h2>Saved goals</h2>
              <ul>
                {goals.map((goal) => (
                  <li key={goal.id}>
                    {goal.name} — {formatMoney(goal.price, currency)} —{" "}
                    {formatVerdict(goal.verdict, currency)}
                    <button
                      type="button"
                      onClick={() => setPrice(formatAmount(goal.price))}
                    >
                      Reopen
                    </button>
                    <button type="button" onClick={() => removeGoal(goal.id)}>
                      Remove goal
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
