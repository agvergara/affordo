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

const CURRENCIES: Settings["currency"][] = ["EUR", "GBP", "USD"];
const PAYMENT_PERIODS = [12, 14];
const FREQUENCIES: Frequency[] = ["weekly", "monthly", "quarterly", "annual"];
const THRESHOLD_BASES: ThresholdBasis[] = ["monthly", "annual"];

/** Cents from a parsed field, blank-as-zero: empty/unparseable/negative → 0. */
function optionalCents(parsed: ParsedAmount): number {
  return parsed.ok ? Math.max(0, parsed.cents) : 0;
}

/** True only when a field holds non-empty input that could not be parsed. */
function isUnparseable(parsed: ParsedAmount): boolean {
  return !parsed.ok && parsed.reason === "invalid";
}

/** An inline hint for a money field whose input can't be parsed; else nothing. */
function moneyHint(parsed: ParsedAmount, testid: string) {
  if (!isUnparseable(parsed)) return null;
  return (
    <p data-testid={testid} role="alert">
      Enter an amount like 1.234,56.
    </p>
  );
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
      currency,
      thresholdPercent: Number.isFinite(thresholdPercentNum)
        ? thresholdPercentNum
        : 10,
      thresholdBasis,
    });
  }, [income, savings, windfall, contribution, expenses, expenseRows, paymentsPerYear, hoursPerWeek, currency, thresholdPercent, thresholdBasis]);

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
          hoursPerDay: 8,
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
    <main>
      <h1>Affordo</h1>

      <p>Your data is private — it never leaves your browser.</p>
      <p>Amounts use European formatting: 1.234,56 (dot for thousands, comma for cents).</p>

      <label htmlFor="currency">Currency</label>
      <select
        id="currency"
        value={currency}
        onChange={(e) => setCurrency(e.target.value as Settings["currency"])}
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <label htmlFor="income">Monthly net income</label>
      <input
        id="income"
        value={income}
        onChange={(e) => setIncome(e.target.value)}
      />
      {moneyHint(parsedIncome, "income-error")}

      <label htmlFor="hours">Hours per week</label>
      <input
        id="hours"
        type="number"
        value={hoursPerWeek}
        onChange={(e) => setHoursPerWeek(e.target.value)}
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
        onChange={(e) => setThresholdBasis(e.target.value as ThresholdBasis)}
      >
        {THRESHOLD_BASES.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>

      <label htmlFor="price">Price</label>
      <input id="price" value={price} onChange={(e) => setPrice(e.target.value)} />
      {moneyHint(parsedPrice, "price-error")}

      <label htmlFor="savings">Current savings</label>
      <input
        id="savings"
        value={savings}
        onChange={(e) => setSavings(e.target.value)}
      />
      {moneyHint(parsedSavings, "savings-error")}

      <label htmlFor="windfall">Windfall (one-off, optional)</label>
      <input
        id="windfall"
        value={windfall}
        onChange={(e) => setWindfall(e.target.value)}
      />
      {moneyHint(parsedWindfall, "windfall-error")}

      <label htmlFor="contribution">Monthly contribution (optional)</label>
      <input
        id="contribution"
        value={contribution}
        onChange={(e) => setContribution(e.target.value)}
      />
      {moneyHint(parsedContribution, "contribution-error")}

      <label htmlFor="expenses">Monthly expenses</label>
      <input
        id="expenses"
        value={expenses}
        onChange={(e) => setExpenses(e.target.value)}
      />
      {moneyHint(parsedExpenses, "expenses-error")}

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
        <p data-testid="hourly-wage">
          Your time is worth {formatMoney(evaluation.netHourlyWage, currency)} per
          hour.
        </p>
      )}

      {evaluation && priceEntered && (
        <p data-testid="time-cost">
          That&apos;s{" "}
          {formatTimeCost(
            evaluation.timeCost.display.value,
            evaluation.timeCost.display.unit,
          )}{" "}
          of your working life.
        </p>
      )}

      {evaluation && priceEntered && evaluation.challenge.triggered && (
        <p data-testid="challenge">
          {formatChallenge(
            evaluation.timeCost.display.value,
            evaluation.timeCost.display.unit,
          )}
        </p>
      )}

      {evaluation && priceEntered && (
        <p data-testid="verdict">
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
                <button type="button" onClick={() => setPrice(formatAmount(goal.price))}>
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
  );
}
