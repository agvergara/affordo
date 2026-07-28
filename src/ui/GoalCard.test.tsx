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
    renderCard(makeGoal({ price: 30000 }), { savings: 0, expenses: 4000, salary: 5000 });
    expect(screen.getByText("Cut to afford")).toBeInTheDocument();
  });

  it("reads Cannot when even a half-expenses cut misses the year", () => {
    renderCard(makeGoal({ price: 500000 }), { savings: 0, expenses: 1000 });
    expect(screen.getByText("Cannot")).toBeInTheDocument();
  });
});
