// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

beforeEach(() => window.localStorage.clear());

describe("App — stage 1 Time Cost", () => {
  it("shows the Time Cost once price and income are entered", async () => {
    const user = userEvent.setup();
    render(<App />);

    // €1300/mo net at the default 40h/wk → €7.50/h.
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    // €240 at €7.50/h = 32 work-hours = 4 work days (8h/day).
    await user.type(screen.getByLabelText(/price/i), "240,00");

    expect(screen.getByTestId("time-cost")).toHaveTextContent(/4 work days/i);
  });

  it("shows the hourly wage in the selected currency symbol", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");

    expect(screen.getByTestId("hourly-wage")).toHaveTextContent("€7,50");

    await user.selectOptions(screen.getByLabelText(/currency/i), "GBP");
    expect(screen.getByTestId("hourly-wage")).toHaveTextContent("£7,50");
  });

  it("advises the user of European number formatting", () => {
    render(<App />);
    expect(screen.getByText(/1\.234,56/)).toBeInTheDocument();
  });

  it("reassures the user that data never leaves the browser", () => {
    render(<App />);
    expect(screen.getByText(/never leaves your browser/i)).toBeInTheDocument();
  });

  it("renders the Affordo title in the page shell", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Affordo", level: 1 }),
    ).toBeInTheDocument();
  });

  it("keeps income refinements collapsed until the user opens them", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Payments-per-year and hours-per-day are refinements, not door fields
    // (ADR 0006): they live in a disclosure that is closed on load.
    const details = screen
      .getByText(/refine income/i)
      .closest("details") as HTMLDetailsElement;
    expect(details).not.toHaveAttribute("open");
    expect(
      within(details).getByLabelText(/hours per day/i),
    ).toBeInTheDocument();
    expect(
      within(details).getByLabelText(/payments per year/i),
    ).toBeInTheDocument();

    await user.click(screen.getByText(/refine income/i));
    expect(details).toHaveAttribute("open");
  });

  it("shows the price and hours behind the Time Cost hero", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    // €7.50/h, €240 = 32 work-hours = 4 work days.
    await user.type(screen.getByLabelText(/price/i), "240,00");

    const hero = screen.getByTestId("time-cost");
    expect(hero).toHaveTextContent(/4 work days/i);
    expect(hero).toHaveTextContent("€240,00");
    expect(hero).toHaveTextContent(/32 hours/i);
  });

  it("shows fractional work-hours without collapsing a real cost to zero", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    // €3 at €7.50/h = 0.4 work-hours — a real cost that must not round to "0 hours".
    await user.type(screen.getByLabelText(/price/i), "3,00");

    const hero = screen.getByTestId("time-cost");
    expect(hero).toHaveTextContent(/0\.4 hours/i);
    expect(hero).not.toHaveTextContent(/·\s*0 hours/i);
  });

  it("reshapes the Time Cost when hours per day changes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    // €7.50/h, €240 = 32 work-hours. At the default 8h/day → 4 work days.
    await user.type(screen.getByLabelText(/price/i), "240,00");
    expect(screen.getByTestId("time-cost")).toHaveTextContent(/4 work days/i);

    // At 4h/day the same 32 hours is 8 work days.
    await user.clear(screen.getByLabelText(/hours per day/i));
    await user.type(screen.getByLabelText(/hours per day/i), "4");
    expect(screen.getByTestId("time-cost")).toHaveTextContent(/8 work days/i);
  });

  it("persists hours per day across a reload", async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.clear(screen.getByLabelText(/hours per day/i));
    await user.type(screen.getByLabelText(/hours per day/i), "6");
    first.unmount();

    render(<App />);
    expect(screen.getByLabelText(/hours per day/i)).toHaveValue(6);
  });

  it("falls back to an 8-hour day when hours per day is cleared", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await user.type(screen.getByLabelText(/price/i), "240,00");
    // Clearing hours/day must not break evaluation — it falls back to 8h → 4 work days.
    await user.clear(screen.getByLabelText(/hours per day/i));
    expect(screen.getByTestId("time-cost")).toHaveTextContent(/4 work days/i);
    expect(document.body).not.toHaveTextContent("NaN");
  });

  it("bounds hours per day to a physical 24-hour maximum", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await user.type(screen.getByLabelText(/price/i), "240,00"); // 32 work-hours

    // 200h/day is impossible; clamped to 24h → the headline unit is work days,
    // not raw hours. (The hero's figures line always shows the raw work-hours;
    // it's the display ladder — the headline — that must not fall back to hours.)
    await user.clear(screen.getByLabelText(/hours per day/i));
    await user.type(screen.getByLabelText(/hours per day/i), "200");
    const headline = screen.getByTestId("time-cost-headline");
    expect(headline).toHaveTextContent(/work day/i);
    expect(headline).not.toHaveTextContent(/hours/i);
  });

  it("shows no wage when hours per week is cleared to zero", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await user.clear(screen.getByLabelText(/hours per week/i));
    expect(screen.queryByTestId("hourly-wage")).toBeNull();
  });

  it("flags unparseable income with a hint and computes nothing", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Empty income shows no hint — a blank field is not an error.
    expect(screen.queryByTestId("income-error")).toBeNull();

    await user.type(screen.getByLabelText(/monthly net income/i), "abc");
    expect(screen.getByTestId("income-error")).toBeInTheDocument();
    expect(screen.queryByTestId("hourly-wage")).toBeNull();
  });

  it("flags an unparseable price and recovers once it is corrected", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");

    await user.type(screen.getByLabelText(/price/i), "1,2,3");
    expect(screen.getByTestId("price-error")).toBeInTheDocument();
    expect(screen.queryByTestId("time-cost")).toBeNull();
    expect(screen.queryByTestId("verdict")).toBeNull();

    // Correcting the price clears the hint and produces a verdict.
    await user.clear(screen.getByLabelText(/price/i));
    await user.type(screen.getByLabelText(/price/i), "240,00");
    expect(screen.queryByTestId("price-error")).toBeNull();
    expect(screen.getByTestId("verdict")).toBeInTheDocument();
  });

  it("treats a valid 0,00 as zero and never renders NaN from garbage input", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await user.type(screen.getByLabelText(/price/i), "240,00");

    // A real 0,00 in an optional field is a valid zero, not an error.
    await user.type(screen.getByLabelText(/current savings/i), "0,00");
    expect(screen.queryByTestId("verdict")).not.toHaveTextContent(
      /afford this right now/i,
    );

    // Garbage in optional fields is absorbed as zero — nothing renders "NaN".
    await user.type(screen.getByLabelText(/monthly expenses/i), "xyz");
    await user.type(screen.getByLabelText(/windfall/i), "!!!");
    expect(document.body).not.toHaveTextContent("NaN");
  });

  it("flags an unparseable optional field instead of silently dropping it to zero", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await user.type(screen.getByLabelText(/price/i), "240,00");

    // A typo'd savings must not silently become €0 with no signal.
    await user.type(screen.getByLabelText(/current savings/i), "5o0");
    expect(screen.getByTestId("savings-error")).toBeInTheDocument();

    // Empty stays silent — a blank optional field is not an error.
    await user.clear(screen.getByLabelText(/current savings/i));
    expect(screen.queryByTestId("savings-error")).toBeNull();
  });

  it("shows no Time Cost for a non-positive price", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");

    await user.type(screen.getByLabelText(/price/i), "-50,00");
    expect(screen.queryByTestId("time-cost")).toBeNull();

    await user.clear(screen.getByLabelText(/price/i));
    await user.type(screen.getByLabelText(/price/i), "0,00");
    expect(screen.queryByTestId("time-cost")).toBeNull();
  });

  it("says you can afford it now when savings cover the price", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await user.type(screen.getByLabelText(/price/i), "240,00");
    await user.type(screen.getByLabelText(/current savings/i), "500,00");
    expect(screen.getByTestId("verdict")).toHaveTextContent(
      /afford this right now/i,
    );
  });

  it("shows a Save-Up horizon when savings fall short but income covers expenses", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await user.type(screen.getByLabelText(/price/i), "240,00");
    await user.type(screen.getByLabelText(/current savings/i), "100,00");
    // no expenses → full surplus; €140 remaining → about 1 month
    expect(screen.getByTestId("verdict")).toHaveTextContent(/about 1 month/i);
  });

  it("shows a Save-Up horizon in months when savings fall short but Surplus is positive", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await user.type(screen.getByLabelText(/monthly expenses/i), "300,00");
    await user.type(screen.getByLabelText(/price/i), "3.000,00");
    // surplus €1000/mo, need €3000 → 3 months
    expect(screen.getByTestId("verdict")).toHaveTextContent(/about 3 months/i);
  });

  it("shows Not Reachable with the monthly shortfall when expenses exceed income", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await user.type(screen.getByLabelText(/monthly expenses/i), "1.500,00");
    await user.type(screen.getByLabelText(/price/i), "240,00");
    const verdict = screen.getByTestId("verdict");
    expect(verdict).toHaveTextContent(/not reachable/i);
    expect(verdict).toHaveTextContent("€200,00");
  });

  it("itemizes expenses into a monthly total that replaces the estimate", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /add expense/i }));
    await user.type(screen.getAllByLabelText(/expense amount/i)[0]!, "100,00");
    await user.selectOptions(
      screen.getAllByLabelText(/expense frequency/i)[0]!,
      "weekly",
    );
    // €100/week → €433,33/mo
    expect(screen.getByTestId("monthly-expenses-total")).toHaveTextContent(
      "€433,33",
    );
  });

  it("keeps the single estimate until an itemized amount is actually entered", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly expenses/i), "800,00");
    await user.click(screen.getByRole("button", { name: /add expense/i }));
    // An empty row must not replace the €800 estimate with €0.
    expect(screen.queryByTestId("monthly-expenses-total")).toBeNull();
  });

  it("removes an itemized expense row", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /add expense/i }));
    await user.type(screen.getAllByLabelText(/expense amount/i)[0]!, "100,00");
    expect(screen.getByTestId("monthly-expenses-total")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remove/i }));
    expect(screen.queryByTestId("monthly-expenses-total")).toBeNull();
  });

  it("raises income when more pay periods per year are selected", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    expect(screen.getByTestId("hourly-wage")).toHaveTextContent("€7,50");

    await user.selectOptions(screen.getByLabelText(/payments per year/i), "14");
    expect(screen.getByTestId("hourly-wage")).toHaveTextContent("€8,75");
  });

  it("lengthens the Save-Up horizon when a custom contribution below surplus is set", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await user.type(screen.getByLabelText(/monthly expenses/i), "300,00");
    await user.type(screen.getByLabelText(/price/i), "3.000,00");
    expect(screen.getByTestId("verdict")).toHaveTextContent(/about 3 months/i);

    await user.type(screen.getByLabelText(/monthly contribution/i), "500,00");
    expect(screen.getByTestId("verdict")).toHaveTextContent(/about 6 months/i);
  });

  it("adds a windfall to savings, flipping a goal to Affordable Now", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await user.type(screen.getByLabelText(/price/i), "240,00");
    await user.type(screen.getByLabelText(/current savings/i), "100,00");
    expect(screen.getByTestId("verdict")).not.toHaveTextContent(
      /afford this right now/i,
    );

    await user.type(screen.getByLabelText(/windfall/i), "200,00");
    expect(screen.getByTestId("verdict")).toHaveTextContent(
      /afford this right now/i,
    );
  });

  it("leaves Hours per week empty, not zero, when cleared", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.clear(screen.getByLabelText(/hours per week/i));

    expect(screen.getByLabelText(/hours per week/i)).toHaveValue(null);
  });

  it("clears the Significance threshold to empty and falls back to the default 10%", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.clear(screen.getByLabelText(/significance threshold/i));
    expect(screen.getByLabelText(/significance threshold/i)).toHaveValue(null);

    // With the threshold cleared, evaluation falls back to 10% of monthly net:
    // €130 for €1300/mo, so a €240 purchase is still challenged.
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await user.type(screen.getByLabelText(/price/i), "240,00");
    expect(screen.getByTestId("challenge")).toBeInTheDocument();
  });

  it("keeps a deliberate 0% threshold, which never challenges", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");

    // A deliberate 0% must not collapse into the 10% default: 0% never challenges.
    await user.clear(screen.getByLabelText(/significance threshold/i));
    await user.type(screen.getByLabelText(/significance threshold/i), "0");
    await user.type(screen.getByLabelText(/price/i), "240,00");

    expect(screen.queryByTestId("challenge")).toBeNull();
  });

  it("challenges a purchase above the Significance Threshold and stays quiet below it", async () => {
    const user = userEvent.setup();
    render(<App />);
    // €1300/mo net → default threshold 10% = €130.
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");

    // €240 exceeds €130 → challenge appears.
    await user.type(screen.getByLabelText(/price/i), "240,00");
    expect(screen.getByTestId("challenge")).toHaveTextContent(/significant/i);

    // €50 is below the threshold → no challenge.
    await user.clear(screen.getByLabelText(/price/i));
    await user.type(screen.getByLabelText(/price/i), "50,00");
    expect(screen.queryByTestId("challenge")).toBeNull();
  });

  it("persists a customized Significance Threshold across reopen and re-evaluates against it", async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    // Raise the threshold to 25% (€325) so a €240 price no longer challenges.
    await user.clear(screen.getByLabelText(/threshold/i));
    await user.type(screen.getByLabelText(/threshold/i), "25");
    await user.selectOptions(
      screen.getByLabelText(/reference period/i),
      "annual",
    );
    first.unmount();

    render(<App />);
    expect(screen.getByLabelText(/threshold/i)).toHaveValue(25);
    expect(screen.getByLabelText(/reference period/i)).toHaveValue("annual");

    // 25% of annual income is far above €240 → no challenge.
    await user.type(screen.getByLabelText(/price/i), "240,00");
    expect(screen.queryByTestId("challenge")).toBeNull();
  });

  it("restores the saved profile after the app is reopened", async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await user.type(screen.getByLabelText(/current savings/i), "500,00");
    await user.type(screen.getByLabelText(/windfall/i), "250,00");
    await user.type(screen.getByLabelText(/monthly contribution/i), "300,00");
    await user.type(screen.getByLabelText(/monthly expenses/i), "800,00");
    await user.selectOptions(screen.getByLabelText(/currency/i), "GBP");
    await user.selectOptions(screen.getByLabelText(/payments per year/i), "14");
    await user.click(screen.getByRole("button", { name: /add expense/i }));
    await user.type(screen.getAllByLabelText(/expense amount/i)[0]!, "100,00");
    first.unmount();

    render(<App />);
    expect(screen.getByLabelText(/monthly net income/i)).toHaveValue(
      "1.300,00",
    );
    expect(screen.getByLabelText(/current savings/i)).toHaveValue("500,00");
    expect(screen.getByLabelText(/windfall/i)).toHaveValue("250,00");
    expect(screen.getByLabelText(/monthly contribution/i)).toHaveValue(
      "300,00",
    );
    expect(screen.getByLabelText(/monthly expenses/i)).toHaveValue("800,00");
    expect(screen.getByLabelText(/currency/i)).toHaveValue("GBP");
    expect(screen.getByLabelText(/payments per year/i)).toHaveValue("14");
    expect(screen.getAllByLabelText(/expense amount/i)[0]!).toHaveValue(
      "100,00",
    );
  });
});

describe("App — Saved Goals", () => {
  /** Enter income + price so a result exists, then save it under a name. */
  async function saveGoal(
    user: ReturnType<typeof userEvent.setup>,
    name: string,
    price: string,
  ) {
    await user.type(screen.getByLabelText(/price/i), price);
    await user.type(screen.getByLabelText(/goal name/i), name);
    await user.click(screen.getByRole("button", { name: /save as goal/i }));
  }

  it("saves a result as a named Goal listed with its price and verdict", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    // €1300/mo, no savings, €240 → save-up about 1 month.
    await saveGoal(user, "MacBook", "240,00");

    const goals = screen.getByTestId("goals");
    expect(goals).toHaveTextContent("MacBook");
    expect(goals).toHaveTextContent("€240,00");
    expect(goals).toHaveTextContent(/about 1 month/i);
  });

  it("lists multiple Goals and removes one without touching the others", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");

    await saveGoal(user, "MacBook", "240,00");
    await user.clear(screen.getByLabelText(/price/i));
    await saveGoal(user, "Bike", "500,00");

    let items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);

    // Remove the MacBook goal; the Bike goal survives.
    const macbook = items.find((li) => li.textContent?.includes("MacBook"))!;
    await user.click(
      within(macbook).getByRole("button", { name: /remove goal/i }),
    );

    items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(screen.getByTestId("goals")).toHaveTextContent("Bike");
    expect(screen.getByTestId("goals")).not.toHaveTextContent("MacBook");
  });

  it("keeps a Goal's snapshotted verdict when the profile later changes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await user.type(screen.getByLabelText(/current savings/i), "500,00");
    // €500 savings covers €240 → Affordable Now at save time.
    await saveGoal(user, "MacBook", "240,00");
    expect(screen.getByTestId("goals")).toHaveTextContent(
      /afford this right now/i,
    );

    // Drain savings after saving; the snapshot must not recompute.
    await user.clear(screen.getByLabelText(/current savings/i));
    expect(screen.getByTestId("goals")).toHaveTextContent(
      /afford this right now/i,
    );
  });

  it("reopens a Goal by repopulating the Price field so it can be revisited", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await saveGoal(user, "MacBook", "240,00");

    // Clear the price, then reopen the saved goal to bring it back.
    await user.clear(screen.getByLabelText(/price/i));
    expect(screen.getByLabelText(/price/i)).toHaveValue("");

    await user.click(screen.getByRole("button", { name: /reopen/i }));
    expect(screen.getByLabelText(/price/i)).toHaveValue("240,00");
  });

  it("keeps saved Goals across a reload", async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await saveGoal(user, "MacBook", "240,00");
    first.unmount();

    render(<App />);
    expect(screen.getByTestId("goals")).toHaveTextContent("MacBook");
    expect(screen.getByTestId("goals")).toHaveTextContent("€240,00");
  });
});
