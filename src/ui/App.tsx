import { useEffect, useState } from "react";
import { evaluate, parseAmount } from "../engine";
import type { Settings } from "../engine";
import { formatMoney, formatTimeCost, formatVerdict } from "./format";
import {
  monthlyExpensesTotal,
  type ExpenseItem,
  type ExpenseRow,
  type Frequency,
} from "./expenses";
import { loadProfile, saveProfile } from "./storage";

const CURRENCIES: Settings["currency"][] = ["EUR", "GBP", "USD"];
const PAYMENT_PERIODS = [12, 14];
const FREQUENCIES: Frequency[] = ["weekly", "monthly", "quarterly", "annual"];

function rowToItem(row: ExpenseRow): ExpenseItem {
  const amount = parseAmount(row.amount);
  return {
    label: row.label,
    amount: Number.isFinite(amount) ? Math.max(0, amount) : 0,
    frequency: row.frequency,
  };
}

export function App() {
  const saved = loadProfile();
  const [price, setPrice] = useState("");
  const [income, setIncome] = useState(saved?.income ?? "");
  const [savings, setSavings] = useState(saved?.savings ?? "");
  const [expenses, setExpenses] = useState(saved?.monthlyExpenses ?? "");
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>(
    saved?.expenseRows ?? [],
  );
  const [paymentsPerYear, setPaymentsPerYear] = useState(
    saved?.paymentsPerYear ?? 12,
  );
  const [hoursPerWeek, setHoursPerWeek] = useState(saved?.hoursPerWeek ?? 40);
  const [currency, setCurrency] = useState<Settings["currency"]>(
    saved?.currency ?? "EUR",
  );

  useEffect(() => {
    saveProfile({
      income,
      savings,
      monthlyExpenses: expenses,
      expenseRows,
      paymentsPerYear,
      hoursPerWeek,
      currency,
    });
  }, [income, savings, expenses, expenseRows, paymentsPerYear, hoursPerWeek, currency]);

  const incomeCents = parseAmount(income);
  const priceCents = parseAmount(price);
  const savingsCents = parseAmount(savings);
  const expensesCents = parseAmount(expenses);
  const clamp = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);
  const incomeValid = Number.isFinite(incomeCents) && incomeCents > 0;
  const hoursValid = Number.isFinite(hoursPerWeek) && hoursPerWeek > 0;
  const canEvaluate = incomeValid && hoursValid;
  const priceEntered =
    price.trim() !== "" && Number.isFinite(priceCents) && priceCents > 0;

  // Itemized expenses replace the single estimate when any rows exist.
  const itemized = expenseRows.length > 0;
  const monthlyExpenses = itemized
    ? monthlyExpensesTotal(expenseRows.map(rowToItem))
    : clamp(expensesCents);

  const updateRow = (index: number, patch: Partial<ExpenseRow>) =>
    setExpenseRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );

  const evaluation = canEvaluate
    ? evaluate(
        {
          income: { monthlyNet: incomeCents, hoursPerWeek, paymentsPerYear },
          hoursPerDay: 8,
          savings: clamp(savingsCents),
          monthlyExpenses,
        },
        { price: priceEntered ? priceCents : 0 },
        { currency },
      )
    : null;

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

      <label htmlFor="hours">Hours per week</label>
      <input
        id="hours"
        type="number"
        value={hoursPerWeek}
        onChange={(e) => setHoursPerWeek(Number(e.target.value))}
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

      <label htmlFor="price">Price</label>
      <input id="price" value={price} onChange={(e) => setPrice(e.target.value)} />

      <label htmlFor="savings">Current savings</label>
      <input
        id="savings"
        value={savings}
        onChange={(e) => setSavings(e.target.value)}
      />

      <label htmlFor="expenses">Monthly expenses</label>
      <input
        id="expenses"
        value={expenses}
        onChange={(e) => setExpenses(e.target.value)}
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

      {evaluation && priceEntered && (
        <p data-testid="verdict">
          {formatVerdict(evaluation.verdict, currency)}
        </p>
      )}
    </main>
  );
}
