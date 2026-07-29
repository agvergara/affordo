// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GoalsDashboard } from "./GoalsDashboard";
import { AffordoProvider } from "../state/AffordoProvider";
import { ThemeProvider } from "../state/ThemeProvider";
import { defaultProfile, saveProfile } from "../state/profile-store";
import { loadGoals, saveGoals, type Goal } from "../state/goals-store";

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

/** Throw the dashboard away and build it again from localStorage alone. */
function remount() {
  cleanup();
  mount();
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

/**
 * The identity guarantees of PRD story 51. These are the assertions that must
 * *fail* if the dialog ever re-stamps a goal on save, so each one names the
 * value it pins rather than settling for a green list.
 */
describe("Editing a goal — the goal keeps its identity", () => {
  it("keeps the goal's id, so the edit lands on the same record", async () => {
    const user = renderDashboard([makeGoal({ id: "goal-1" })]);

    await renameFirstGoal(user, "House deposit");

    const stored = loadGoals();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.id).toBe("goal-1");
    expect(stored[0]?.name).toBe("House deposit");
  });

  it("keeps the goal's original creation date rather than re-stamping it", async () => {
    // The card prints `createdAt` as its date line, so a re-stamped goal would
    // start reading as today's date instead of the day it was created.
    const user = renderDashboard([
      makeGoal({ createdAt: new Date(2024, 0, 15, 12).getTime() }),
    ]);
    expect(within(card()).getByText("1/15/2024")).toBeInTheDocument();

    await renameFirstGoal(user, "House deposit");

    expect(within(card()).getByText("1/15/2024")).toBeInTheDocument();
    expect(loadGoals()[0]?.createdAt).toBe(new Date(2024, 0, 15, 12).getTime());
  });

  it("leaves the goal where it sat in the list", async () => {
    // A goal swapped in by id keeps its position; one removed and re-added
    // would jump to the top, since new goals are prepended.
    const user = renderDashboard([
      makeGoal({ id: "a", name: "Down payment" }),
      makeGoal({ id: "b", name: "MacBook Pro" }),
    ]);

    await user.click(within(card(1)).getByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "MacBook Air");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(card(0)).toHaveTextContent("Down payment");
    expect(card(1)).toHaveTextContent("MacBook Air");
    expect(loadGoals().map((g) => g.id)).toEqual(["a", "b"]);
  });

  it("keeps the edit after the dashboard is reloaded", async () => {
    const user = renderDashboard([makeGoal({ name: "Down payment" })]);

    await renameFirstGoal(user, "House deposit");
    remount();

    expect(screen.getByTestId("goals-list")).toHaveTextContent("House deposit");
    expect(screen.getByTestId("saved-goals-divider")).toHaveTextContent(
      "Saved goals · 1",
    );
  });
});

/**
 * One dialog serves both jobs, so the state of one use must not survive into the
 * next. These are the tests that catch a stale `initial` — the failure mode of
 * extending the create dialog rather than forking a second one.
 */
describe("Editing a goal — the dialog does not leak between uses", () => {
  it("opens Add goal empty after an edit", async () => {
    const user = renderDashboard([
      makeGoal({ name: "Down payment", price: 5000, note: "Two-bed flat" }),
    ]);

    await renameFirstGoal(user, "House deposit");
    await user.click(screen.getByRole("button", { name: "Add goal" }));

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Add goal" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Price")).toHaveValue(null);
    expect(screen.getByLabelText("Note (optional)")).toHaveValue("");
  });

  it("re-seeds from the goal after a cancelled edit", async () => {
    const user = renderDashboard([makeGoal({ name: "Down payment" })]);

    await user.click(within(card()).getByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Discarded");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await user.click(within(card()).getByRole("button", { name: "Edit" }));

    expect(screen.getByLabelText("Name")).toHaveValue("Down payment");
    expect(screen.getByTestId("goals-list")).toHaveTextContent("Down payment");
  });

  it("re-seeds when the user moves from one goal's edit to another's", async () => {
    const user = renderDashboard([
      makeGoal({ id: "a", name: "Down payment", price: 5000 }),
      makeGoal({ id: "b", name: "MacBook Pro", price: 1500 }),
    ]);

    await user.click(within(card(0)).getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(within(card(1)).getByRole("button", { name: "Edit" }));

    expect(screen.getByLabelText("Name")).toHaveValue("MacBook Pro");
    expect(screen.getByLabelText("Price")).toHaveValue(1500);
  });

  it("shows the freshly saved values when the same goal is edited twice", async () => {
    const user = renderDashboard([makeGoal({ name: "Down payment" })]);

    await renameFirstGoal(user, "House deposit");
    await user.click(within(card()).getByRole("button", { name: "Edit" }));

    expect(screen.getByLabelText("Name")).toHaveValue("House deposit");
  });
});

describe("Removing a goal", () => {
  it("deletes the goal from the dashboard", async () => {
    const user = renderDashboard([makeGoal({ name: "Down payment" })]);

    await user.click(within(card()).getByRole("button", { name: "Remove" }));

    expect(screen.queryByTestId("goals-list")).not.toBeInTheDocument();
    expect(screen.getByTestId("goals-empty")).toBeInTheDocument();
    expect(screen.getByTestId("saved-goals-divider")).toHaveTextContent(
      "Saved goals · 0",
    );
  });

  it("removes only the goal whose own Remove was pressed", async () => {
    const user = renderDashboard([
      makeGoal({ id: "a", name: "Down payment" }),
      makeGoal({ id: "b", name: "MacBook Pro" }),
      makeGoal({ id: "c", name: "Sabbatical" }),
    ]);

    await user.click(within(card(1)).getByRole("button", { name: "Remove" }));

    expect(loadGoals().map((g) => g.id)).toEqual(["a", "c"]);
    expect(card(0)).toHaveTextContent("Down payment");
    expect(card(1)).toHaveTextContent("Sabbatical");
  });

  // Two goals can share a name, a price and a date; only the id tells them
  // apart. Removing by anything else would take both.
  it("removes one of two identical-looking goals, not both", async () => {
    const user = renderDashboard([
      makeGoal({ id: "a", name: "Down payment", price: 5000 }),
      makeGoal({ id: "b", name: "Down payment", price: 5000 }),
    ]);

    await user.click(within(card(0)).getByRole("button", { name: "Remove" }));

    expect(loadGoals().map((g) => g.id)).toEqual(["b"]);
    expect(screen.getByTestId("saved-goals-divider")).toHaveTextContent(
      "Saved goals · 1",
    );
  });

  it("keeps the goal deleted after the dashboard is reloaded", async () => {
    const user = renderDashboard([
      makeGoal({ id: "a", name: "Down payment" }),
      makeGoal({ id: "b", name: "MacBook Pro" }),
    ]);

    await user.click(within(card(0)).getByRole("button", { name: "Remove" }));
    remount();

    expect(screen.getByTestId("saved-goals-divider")).toHaveTextContent(
      "Saved goals · 1",
    );
    expect(screen.getByTestId("goals-list")).toHaveTextContent("MacBook Pro");
    expect(screen.getByTestId("goals-list")).not.toHaveTextContent(
      "Down payment",
    );
  });
});
