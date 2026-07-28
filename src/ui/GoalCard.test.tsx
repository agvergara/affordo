// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { GoalCard } from "./GoalCard";
import { AffordoProvider } from "../state/AffordoProvider";
import { defaultProfile, saveProfile } from "../state/profile-store";
import type { Goal } from "../state/goals-store";

beforeEach(() => window.localStorage.clear());

/** Local noon, so the rendered date is the same calendar day in every timezone. */
const JAN_15_2024 = new Date(2024, 0, 15, 12).getTime();

function makeGoal(overrides?: Partial<Goal>): Goal {
  return {
    id: "g1",
    name: "MacBook",
    price: 1500,
    note: "",
    createdAt: JAN_15_2024,
    ...overrides,
  };
}

/**
 * Render one card inside a real provider hydrated to a given profile. `act`
 * flushes the provider's post-mount hydration so the card reads the persisted
 * profile rather than the empty defaults.
 */
function renderCard(
  goal: Goal = makeGoal(),
  profile?: Partial<typeof defaultProfile>,
) {
  saveProfile({ ...defaultProfile, salary: 2000, ...profile });
  act(() => {
    render(
      <AffordoProvider>
        <GoalCard goal={goal} />
      </AffordoProvider>,
    );
  });
}

describe("GoalCard header", () => {
  it("stamps the goal with its creation date in US format", () => {
    renderCard(makeGoal({ createdAt: JAN_15_2024 }));
    expect(screen.getByText("1/15/2024")).toBeInTheDocument();
  });

  it("names the goal as the card's heading", () => {
    renderCard(makeGoal({ name: "Down payment" }));
    expect(
      screen.getByRole("heading", { name: "Down payment" }),
    ).toBeInTheDocument();
  });

  it("shows the note when the goal has one", () => {
    renderCard(makeGoal({ note: "16 inch, refurbished" }));
    expect(screen.getByText("16 inch, refurbished")).toBeInTheDocument();
    expect(screen.getByTestId("goal-note")).toBeInTheDocument();
  });

  it("shows no note line when the goal has none", () => {
    renderCard(makeGoal({ note: "" }));
    expect(screen.queryByTestId("goal-note")).not.toBeInTheDocument();
  });
});

describe("GoalCard verdict badge", () => {
  it("reads Afford when savings already cover the price", () => {
    renderCard(makeGoal({ price: 1500 }), { savings: 2000 });
    expect(screen.getByText("Afford")).toBeInTheDocument();
  });

  it("reads Stretch when the surplus reaches the price within a year", () => {
    // 1500 to find, 1000/mo surplus (2000 − 1000) → 1.5 months.
    renderCard(makeGoal({ price: 1500 }), { savings: 0, expenses: 1000 });
    expect(screen.getByText("Stretch")).toBeInTheDocument();
  });

  it("reads Cut to afford when only trimming expenses reaches it in a year", () => {
    // 30000 over 12 months needs 2500/mo; surplus is 1000, and the 1500
    // shortfall is inside half of the 4000 expenses.
    renderCard(makeGoal({ price: 30000 }), {
      savings: 0,
      expenses: 4000,
      salary: 5000,
    });
    expect(screen.getByText("Cut to afford")).toBeInTheDocument();
  });

  it("reads Cannot when even a half-expenses cut misses the year", () => {
    renderCard(makeGoal({ price: 500000 }), { savings: 0, expenses: 1000 });
    expect(screen.getByText("Cannot")).toBeInTheDocument();
  });
});

describe("GoalCard price", () => {
  it("shows the price in the profile currency", () => {
    renderCard(makeGoal({ price: 1500 }), { currency: "EUR" });
    expect(screen.getByText("1.500,00 €")).toBeInTheDocument();
  });

  it("follows the profile to another currency's locale", () => {
    renderCard(makeGoal({ price: 1500 }), { currency: "USD" });
    expect(screen.getByText("$1,500.00")).toBeInTheDocument();
  });
});

/**
 * A profile whose Time value is exactly $12/hour over an 8-hour day
 * (2080 × 12 ÷ (52 × 40)), so a price converts to whole hours and days.
 */
const TWELVE_AN_HOUR = { salary: 2080, currency: "USD" } as const;

describe("GoalCard threshold meter caption", () => {
  it("states the price as a percentage of monthly income", () => {
    // 500 of a 2000 salary is a quarter of a month's income.
    renderCard(makeGoal({ price: 500 }), { salary: 2000 });
    expect(screen.getByText("25% of monthly income")).toBeInTheDocument();
  });

  it("rounds the percentage to one decimal in the profile's locale", () => {
    // 250 of 2000 is 12.5%, written with a decimal comma under de-DE (EUR).
    renderCard(makeGoal({ price: 250 }), { salary: 2000, currency: "EUR" });
    expect(screen.getByText("12,5% of monthly income")).toBeInTheDocument();
  });

  it("shows an em dash rather than NaN when there is no income to measure against", () => {
    // salary 0 makes pctOfMonthlyIncome Infinity (dossier §8).
    renderCard(makeGoal({ price: 500 }), { salary: 0 });
    expect(screen.getByText("—% of monthly income")).toBeInTheDocument();
  });
});

describe("GoalCard threshold caption", () => {
  it("names the profile's significance threshold beside the percentage", () => {
    renderCard(makeGoal({ price: 500 }), { threshold: 15 });
    expect(screen.getByText("Significance threshold: 15%")).toBeInTheDocument();
  });
});

describe("GoalCard work figure", () => {
  it("counts the price in days of work once it costs a full work day", () => {
    // $480 ÷ $12/hour = 40 hours = 5 eight-hour days.
    renderCard(makeGoal({ price: 480 }), TWELVE_AN_HOUR);
    expect(screen.getByText("5 days of work")).toBeInTheDocument();
  });

  it("counts the price in hours of work when it costs less than a day", () => {
    // $60 ÷ $12/hour = 5 hours — 0.625 of a work day, so hours it is.
    renderCard(makeGoal({ price: 60 }), TWELVE_AN_HOUR);
    expect(screen.getByText("5 hours of work")).toBeInTheDocument();
  });

  it("switches to days at exactly one work day", () => {
    // $96 ÷ $12/hour = 8 hours = 1 day exactly, the >= 1 boundary.
    renderCard(makeGoal({ price: 96 }), TWELVE_AN_HOUR);
    expect(screen.getByText("1 days of work")).toBeInTheDocument();
  });
});
