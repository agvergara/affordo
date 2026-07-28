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
});
