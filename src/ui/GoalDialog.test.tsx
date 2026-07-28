// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  act,
  cleanup,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GoalsDashboard } from "./GoalsDashboard";
import { AffordoProvider } from "../state/AffordoProvider";
import { defaultProfile, saveProfile } from "../state/profile-store";
import { saveGoals, type Goal } from "../state/goals-store";

beforeEach(() => window.localStorage.clear());

/** A minimal already-saved Goal, for tests that need existing goals. */
function makeGoal(overrides?: Partial<Goal>): Goal {
  return {
    id: crypto.randomUUID(),
    name: "Down payment",
    price: 5000,
    note: "",
    createdAt: 0,
    ...overrides,
  };
}

/**
 * Render the dashboard inside a real provider with a usable profile. The dialog
 * is only reachable through the dashboard's Add goal button, so every test here
 * drives it the way a user does — no direct mounting of `GoalDialog`.
 */
function renderDashboard(goals: Goal[] = []) {
  saveProfile({ ...defaultProfile, salary: 2000 });
  saveGoals(goals);
  act(() => {
    render(
      <AffordoProvider>
        <GoalsDashboard />
      </AffordoProvider>,
    );
  });
  return userEvent.setup();
}

describe("Add goal dialog — opening", () => {
  it("opens from the dashboard Add goal button", async () => {
    const user = renderDashboard();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add goal" }));

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Add goal" }),
    ).toBeInTheDocument();
  });
});

describe("Add goal dialog — fields", () => {
  it("offers Name, Price and an optional Note, with the reference placeholders", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));

    expect(screen.getByLabelText("Name")).toHaveAttribute(
      "placeholder",
      "MacBook Pro",
    );
    expect(screen.getByLabelText("Price")).toHaveAttribute("placeholder", "0");
    expect(screen.getByLabelText("Note (optional)")).toBeInTheDocument();
  });

  it("focuses Name when the dialog opens, so the user can type straight away", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));

    expect(screen.getByLabelText("Name")).toHaveFocus();
  });

  it("caps Name at 80 characters and Note at 200", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));

    expect(screen.getByLabelText("Name")).toHaveAttribute("maxLength", "80");
    expect(screen.getByLabelText("Note (optional)")).toHaveAttribute(
      "maxLength",
      "200",
    );
  });
});

describe("Add goal dialog — Save gating", () => {
  it("disables Save on an empty form", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("keeps Save disabled with a name but no price", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.type(screen.getByLabelText("Name"), "MacBook Pro");

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("keeps Save disabled with a price but no name", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.type(screen.getByLabelText("Price"), "1500");

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("keeps Save disabled when the price is not above zero", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.type(screen.getByLabelText("Name"), "MacBook Pro");
    await user.type(screen.getByLabelText("Price"), "0");

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("treats a whitespace-only name as empty", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.type(screen.getByLabelText("Name"), "   ");
    await user.type(screen.getByLabelText("Price"), "1500");

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("enables Save once there is a name and a positive price", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.type(screen.getByLabelText("Name"), "MacBook Pro");
    await user.type(screen.getByLabelText("Price"), "1500");

    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });
});

describe("Add goal dialog — saving", () => {
  it("adds the goal to the dashboard and closes the dialog", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.type(screen.getByLabelText("Name"), "MacBook Pro");
    await user.type(screen.getByLabelText("Price"), "1500");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("goals-list")).toHaveTextContent("MacBook Pro");
  });

  it("submits on Enter from a field, without reaching for Save", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.type(screen.getByLabelText("Name"), "MacBook Pro");
    await user.type(screen.getByLabelText("Price"), "1500{Enter}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("goals-list")).toHaveTextContent("MacBook Pro");
  });

  it("ignores Enter while the form is still invalid", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.type(screen.getByLabelText("Name"), "MacBook Pro{Enter}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("saved-goals-divider")).toHaveTextContent(
      "Saved goals · 0",
    );
  });

  it("prepends the new goal so the most recent sits on top", async () => {
    const user = renderDashboard([makeGoal({ name: "Down payment" })]);
    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.type(screen.getByLabelText("Name"), "MacBook Pro");
    await user.type(screen.getByLabelText("Price"), "1500");
    await user.click(screen.getByRole("button", { name: "Save" }));

    const items = within(screen.getByTestId("goals-list")).getAllByRole(
      "listitem",
    );
    expect(items[0]).toHaveTextContent("MacBook Pro");
    expect(items[1]).toHaveTextContent("Down payment");
  });

  it("keeps the saved goal after the dashboard is reloaded", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.type(screen.getByLabelText("Name"), "MacBook Pro");
    await user.type(screen.getByLabelText("Price"), "1500");
    await user.click(screen.getByRole("button", { name: "Save" }));

    cleanup();
    act(() => {
      render(
        <AffordoProvider>
          <GoalsDashboard />
        </AffordoProvider>,
      );
    });

    expect(screen.getByTestId("goals-list")).toHaveTextContent("MacBook Pro");
  });

  it("trims surrounding whitespace from the saved name", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.type(screen.getByLabelText("Name"), "   MacBook Pro   ");
    await user.type(screen.getByLabelText("Price"), "1500");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
  });

  it("saves the price the user typed", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.type(screen.getByLabelText("Name"), "MacBook Pro");
    await user.type(screen.getByLabelText("Price"), "1500.50");
    await user.click(screen.getByRole("button", { name: "Save" }));

    // Default profile currency is EUR → de-DE formatting.
    expect(screen.getByTestId("goals-list")).toHaveTextContent("1.500,50 €");
  });
});

describe("Add goal dialog — dismissing", () => {
  it("closes on Cancel without saving anything", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.type(screen.getByLabelText("Name"), "MacBook Pro");
    await user.type(screen.getByLabelText("Price"), "1500");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("saved-goals-divider")).toHaveTextContent(
      "Saved goals · 0",
    );
  });

  it("closes on Escape without saving anything", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.type(screen.getByLabelText("Name"), "MacBook Pro");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("saved-goals-divider")).toHaveTextContent(
      "Saved goals · 0",
    );
  });

  it("offers a Close control for screen-reader users", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Add goal dialog — focus", () => {
  it("keeps Tab inside the dialog rather than letting it escape to the page", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));

    // From the auto-focused Name field: Price, Note, Cancel — Save is disabled
    // on an empty form and so is skipped — then back round to Close.
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();

    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("pulls focus back inside when Tab is pressed from outside the panel", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));

    // Clicking the dialog's own title — not a focusable element — drops focus to
    // the body. A plain Tab from there must land back inside the dialog, not on
    // the page behind it.
    await user.click(screen.getByRole("heading", { name: "Add goal" }));
    await user.tab();

    expect(screen.getByRole("dialog")).toContainElement(
      document.activeElement as HTMLElement,
    );
  });
});

describe("Add goal dialog — overlay", () => {
  it("closes when the overlay behind the panel is clicked", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.type(screen.getByLabelText("Name"), "MacBook Pro");

    await user.click(screen.getByTestId("goal-dialog-overlay"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("saved-goals-divider")).toHaveTextContent(
      "Saved goals · 0",
    );
  });

  it("stays open when the click lands inside the panel", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));

    await user.click(screen.getByRole("heading", { name: "Add goal" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("Add goal dialog — reopening", () => {
  it("starts blank again after a goal was saved", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.type(screen.getByLabelText("Name"), "MacBook Pro");
    await user.type(screen.getByLabelText("Price"), "1500");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await user.click(screen.getByRole("button", { name: "Add goal" }));

    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Price")).toHaveValue(null);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("discards what was typed before a cancel", async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.type(screen.getByLabelText("Name"), "MacBook Pro");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "Add goal" }));

    expect(screen.getByLabelText("Name")).toHaveValue("");
  });
});
