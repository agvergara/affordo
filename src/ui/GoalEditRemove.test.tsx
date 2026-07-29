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

  it("pre-fills the dialog with the goal's own values", async () => {
    const user = renderDashboard([
      makeGoal({ name: "Down payment", price: 5000, note: "Two-bed flat" }),
    ]);

    await user.click(within(card()).getByRole("button", { name: "Edit" }));

    expect(screen.getByLabelText("Name")).toHaveValue("Down payment");
    expect(screen.getByLabelText("Price")).toHaveValue(5000);
    expect(screen.getByLabelText("Note (optional)")).toHaveValue("Two-bed flat");
  });

  it("opens on the goal whose own Edit was pressed, not the first one", async () => {
    const user = renderDashboard([
      makeGoal({ id: "a", name: "Down payment", price: 5000 }),
      makeGoal({ id: "b", name: "MacBook Pro", price: 1500 }),
    ]);

    await user.click(within(card(1)).getByRole("button", { name: "Edit" }));

    expect(screen.getByLabelText("Name")).toHaveValue("MacBook Pro");
    expect(screen.getByLabelText("Price")).toHaveValue(1500);
  });
});

/** Open the first card's Edit dialog, retype the Name, and Save. */
async function renameFirstGoal(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.click(within(card()).getByRole("button", { name: "Edit" }));
  await user.clear(screen.getByLabelText("Name"));
  await user.type(screen.getByLabelText("Name"), name);
  await user.click(screen.getByRole("button", { name: "Save" }));
}

describe("Editing a goal — saving updates it in place", () => {
  it("replaces the goal rather than adding a second one", async () => {
    const user = renderDashboard([makeGoal({ name: "Down payment" })]);

    await renameFirstGoal(user, "House deposit");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("saved-goals-divider")).toHaveTextContent(
      "Saved goals · 1",
    );
    expect(screen.getByTestId("goals-list")).toHaveTextContent("House deposit");
    expect(screen.getByTestId("goals-list")).not.toHaveTextContent(
      "Down payment",
    );
  });

  it("saves the edited price against the same goal", async () => {
    const user = renderDashboard([makeGoal({ price: 5000 })]);

    await user.click(within(card()).getByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText("Price"));
    await user.type(screen.getByLabelText("Price"), "6000");
    await user.click(screen.getByRole("button", { name: "Save" }));

    // Default profile currency is EUR → de-DE formatting.
    expect(screen.getByTestId("goals-list")).toHaveTextContent("6.000,00 €");
    expect(screen.getByTestId("saved-goals-divider")).toHaveTextContent(
      "Saved goals · 1",
    );
  });
});
