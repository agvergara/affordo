// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GoalsDashboard } from "./GoalsDashboard";
import { AffordoProvider } from "../state/AffordoProvider";
import { ThemeProvider } from "../state/ThemeProvider";
import { defaultProfile, saveProfile } from "../state/profile-store";
import { saveGoals, type Goal } from "../state/goals-store";

beforeEach(() => window.localStorage.clear());

/** A goal already on the dashboard, overridable per test. */
function makeGoal(overrides?: Partial<Goal>): Goal {
  return {
    id: "goal-1",
    name: "Down payment",
    price: 5000,
    note: "",
    createdAt: new Date(2024, 0, 15, 12).getTime(),
    ...overrides,
  };
}

/**
 * The dashboard under a real provider. `AppHeader` reads the theme, so every
 * render site in this file — this helper and `remount` below — nests
 * `ThemeProvider` outside `AffordoProvider` or the header throws.
 */
function mount() {
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

/**
 * Render the dashboard with a usable profile and a list of saved goals. Edit and
 * Remove are only reachable through a card, so every test here drives them the
 * way a user does rather than mounting `GoalDialog` directly.
 */
function renderDashboard(goals: Goal[] = [makeGoal()]) {
  saveProfile({ ...defaultProfile, salary: 2000 });
  saveGoals(goals);
  mount();
  return userEvent.setup();
}

/** The card at `index` in the saved-goals list. */
function card(index = 0): HTMLElement {
  const items = within(screen.getByTestId("goals-list")).getAllByRole(
    "listitem",
  );
  const found = items[index];
  if (found === undefined) throw new Error(`no goal card at index ${index}`);
  return found;
}

describe("Editing a goal — opening the dialog", () => {
  it("titles the dialog Edit goal, not Add goal", async () => {
    const user = renderDashboard();

    await user.click(within(card()).getByRole("button", { name: "Edit" }));

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Edit goal" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("heading", { name: "Add goal" }),
    ).not.toBeInTheDocument();
  });
});
