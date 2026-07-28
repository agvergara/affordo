// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GoalsDashboard } from "./GoalsDashboard";
import { AffordoProvider } from "../state/AffordoProvider";
import { defaultProfile, saveProfile } from "../state/profile-store";

beforeEach(() => window.localStorage.clear());

/**
 * Render the dashboard inside a real provider with a usable profile. The dialog
 * is only reachable through the dashboard's Add goal button, so every test here
 * drives it the way a user does — no direct mounting of `GoalDialog`.
 */
function renderDashboard() {
  saveProfile({ ...defaultProfile, salary: 2000 });
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
});
