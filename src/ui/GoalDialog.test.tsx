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
