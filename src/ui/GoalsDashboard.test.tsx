// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import { GoalsDashboard } from "./GoalsDashboard";
import { AffordoProvider } from "../state/AffordoProvider";
import { ThemeProvider } from "../state/ThemeProvider";
import { defaultProfile, saveProfile } from "../state/profile-store";
import { saveGoals, type Goal } from "../state/goals-store";

beforeEach(() => window.localStorage.clear());

/** A minimal reference Goal, overridable per test. */
function makeGoal(overrides?: Partial<Goal>): Goal {
  return {
    id: crypto.randomUUID(),
    name: "MacBook",
    price: 1500,
    note: "",
    createdAt: 0,
    ...overrides,
  };
}

/**
 * Render the dashboard inside a real provider hydrated to a given profile and
 * goal list. `act` flushes the provider's post-mount hydration effect so the
 * dashboard reads the persisted state rather than the empty defaults.
 */
function renderDashboard(
  profile?: Partial<typeof defaultProfile>,
  goals: Goal[] = [],
) {
  saveProfile({ ...defaultProfile, salary: 2000, ...profile });
  saveGoals(goals);
  act(() => {
    render(
      <ThemeProvider>
        <AffordoProvider>
          <GoalsDashboard />
        </AffordoProvider>
      </ThemeProvider>,
    );
  });
}

describe("GoalsDashboard heading", () => {
  it("renders the Goals title and the Affordo eyebrow", () => {
    renderDashboard();
    const title = screen.getByRole("heading", { name: /goals/i });
    expect(title).toBeInTheDocument();
    // The eyebrow sits above the big title, distinct from the header wordmark
    // (which is a link). It's the non-link `Affordo` in the page body.
    const eyebrows = screen
      .getAllByText("Affordo")
      .filter((el) => el.tagName !== "A");
    expect(eyebrows).toHaveLength(1);
  });
});

describe("GoalsDashboard snapshot", () => {
  it("shows Time value per hour derived from the profile", () => {
    // 2000/mo × 12 payments ÷ (52 × 40h) = 11.538…/hour → de-DE EUR formatting.
    renderDashboard({ salary: 2000, currency: "EUR" });
    const cell = screen.getByTestId("snapshot-time-value");
    expect(cell).toHaveTextContent("Time value");
    expect(cell).toHaveTextContent("11,54 €");
    expect(cell).toHaveTextContent("/ hour");
  });

  it("shows Monthly surplus = salary − expenses + contribution", () => {
    // 2000 − 500 + 150 = 1650 → de-DE EUR formatting.
    renderDashboard({
      salary: 2000,
      expenses: 500,
      monthlyContribution: 150,
      currency: "EUR",
    });
    const cell = screen.getByTestId("snapshot-surplus");
    expect(cell).toHaveTextContent("Monthly surplus");
    expect(cell).toHaveTextContent("1.650,00 €");
  });

  it("shows the significance threshold as a percentage", () => {
    renderDashboard({ threshold: 15 });
    const cell = screen.getByTestId("snapshot-threshold");
    expect(cell).toHaveTextContent("15%");
  });

  it("formats the snapshot figures in the profile currency", () => {
    // Same inputs, USD → en-US formatting.
    renderDashboard({
      salary: 2000,
      expenses: 500,
      monthlyContribution: 150,
      currency: "USD",
    });
    expect(screen.getByTestId("snapshot-time-value")).toHaveTextContent(
      "$11.54",
    );
    expect(screen.getByTestId("snapshot-surplus")).toHaveTextContent(
      "$1,650.00",
    );
  });
});

describe("GoalsDashboard saved-goals divider", () => {
  it("shows the live goal count in the divider", () => {
    renderDashboard(undefined, [makeGoal(), makeGoal(), makeGoal()]);
    expect(screen.getByTestId("saved-goals-divider")).toHaveTextContent(
      "Saved goals · 3",
    );
  });

  it("counts zero goals in the divider", () => {
    renderDashboard(undefined, []);
    expect(screen.getByTestId("saved-goals-divider")).toHaveTextContent(
      "Saved goals · 0",
    );
  });
});

describe("GoalsDashboard empty state", () => {
  it("shows the reference empty copy when there are no goals", () => {
    renderDashboard(undefined, []);
    const empty = screen.getByTestId("goals-empty");
    expect(empty).toHaveTextContent("No decisions to reckon with yet.");
    expect(empty).toHaveTextContent(
      "Add your first goal to see what it costs in hours of your life.",
    );
  });

  it("hides the empty state once a goal exists", () => {
    renderDashboard(undefined, [makeGoal()]);
    expect(screen.queryByTestId("goals-empty")).not.toBeInTheDocument();
  });
});

describe("GoalsDashboard list container", () => {
  it("renders one item per goal", () => {
    renderDashboard(undefined, [
      makeGoal({ name: "MacBook" }),
      makeGoal({ name: "Down payment" }),
    ]);
    const list = screen.getByTestId("goals-list");
    expect(within(list).getAllByTestId("goal-item")).toHaveLength(2);
    expect(list).toHaveTextContent("MacBook");
    expect(list).toHaveTextContent("Down payment");
  });

  it("renders no list container when there are no goals", () => {
    renderDashboard(undefined, []);
    expect(screen.queryByTestId("goals-list")).not.toBeInTheDocument();
  });

  it("lets an over-long goal name truncate instead of blowing out the row", () => {
    renderDashboard(undefined, [
      makeGoal({
        name: "A very long goal name that keeps going and going and going",
      }),
    ]);
    const name = screen.getByText(
      "A very long goal name that keeps going and going and going",
    );
    // A flex child needs min-w-0 for `truncate` (overflow:hidden) to clamp;
    // without it the intrinsic width refuses to shrink and the name overflows.
    expect(name).toHaveClass("min-w-0", "truncate");
  });
});

describe("GoalsDashboard Add goal button", () => {
  it("is present with no goals", () => {
    renderDashboard(undefined, []);
    expect(
      screen.getByRole("button", { name: "Add goal" }),
    ).toBeInTheDocument();
  });

  it("is present with goals", () => {
    renderDashboard(undefined, [makeGoal()]);
    expect(
      screen.getByRole("button", { name: "Add goal" }),
    ).toBeInTheDocument();
  });
});
