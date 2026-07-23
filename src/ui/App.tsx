import { useEffect, useState } from "react";
import { evaluate, parseAmount } from "../engine";
import type { Settings } from "../engine";
import { formatMoney, formatTimeCost } from "./format";
import { loadProfile, saveProfile } from "./storage";

const CURRENCIES: Settings["currency"][] = ["EUR", "GBP", "USD"];

export function App() {
  const saved = loadProfile();
  const [price, setPrice] = useState("");
  const [income, setIncome] = useState(saved?.income ?? "");
  const [savings, setSavings] = useState(saved?.savings ?? "");
  const [hoursPerWeek, setHoursPerWeek] = useState(saved?.hoursPerWeek ?? 40);
  const [currency, setCurrency] = useState<Settings["currency"]>(
    saved?.currency ?? "EUR",
  );

  useEffect(() => {
    saveProfile({ income, savings, hoursPerWeek, currency });
  }, [income, savings, hoursPerWeek, currency]);

  const incomeCents = parseAmount(income);
  const priceCents = parseAmount(price);
  const savingsCents = parseAmount(savings);
  const incomeValid = Number.isFinite(incomeCents) && incomeCents > 0;
  const hoursValid = Number.isFinite(hoursPerWeek) && hoursPerWeek > 0;
  const canEvaluate = incomeValid && hoursValid;
  const priceEntered =
    price.trim() !== "" && Number.isFinite(priceCents) && priceCents > 0;

  const evaluation = canEvaluate
    ? evaluate(
        {
          income: { monthlyNet: incomeCents, hoursPerWeek, paymentsPerYear: 12 },
          hoursPerDay: 8,
          savings: Number.isFinite(savingsCents) ? Math.max(0, savingsCents) : 0,
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

      <label htmlFor="price">Price</label>
      <input id="price" value={price} onChange={(e) => setPrice(e.target.value)} />

      <label htmlFor="savings">Current savings</label>
      <input
        id="savings"
        value={savings}
        onChange={(e) => setSavings(e.target.value)}
      />

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
          {evaluation.verdict.kind === "affordable-now"
            ? "You can afford this right now."
            : "Not yet — keep saving toward this."}
        </p>
      )}
    </main>
  );
}
