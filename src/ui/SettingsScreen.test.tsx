// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsScreen } from "./SettingsScreen";
import { AffordoProvider } from "../state/AffordoProvider";
import { ToastProvider } from "./Toast";
import {
  defaultProfile,
  loadProfile,
  saveProfile,
  type Profile,
} from "../state/profile-store";

import { loadGoals, saveGoals, type Goal } from "../state/goals-store";

beforeEach(() => window.localStorage.clear());

/** A saved goal, so a reset has goals to erase as well as a profile. */
function aGoal(): Goal {
  return {
    id: "g1",
    name: "MacBook Pro",
    price: 2400,
    note: "",
    createdAt: 1_700_000_000_000,
  };
}

/**
 * Render SettingsScreen inside a real provider seeded from a persisted profile,
 * so the settings draft hydrates from the same profile the app holds. `act`
 * flushes the provider's post-mount hydration effect. A `ToastProvider` wraps it
 * too, matching the app root (Router mounts one) so Save's success toast can be
 * raised and asserted.
 */
function renderSettings(
  profile: Partial<Profile> = {},
  props: { navigate?: (to: string) => void; confirm?: (m: string) => boolean } = {},
) {
  const seeded: Profile = { ...defaultProfile, salary: 1300, ...profile };
  saveProfile(seeded);
  act(() => {
    render(
      <ToastProvider>
        <AffordoProvider>
          <SettingsScreen {...props} />
        </AffordoProvider>
      </ToastProvider>,
    );
  });
  return seeded;
}

describe("SettingsScreen — Reset everything", () => {
  it("renders the Reset everything action", () => {
    renderSettings();
    expect(
      screen.getByRole("button", { name: "Reset everything" }),
    ).toBeInTheDocument();
  });

  it("asks for confirmation with the reference copy before erasing anything", async () => {
    const user = userEvent.setup();
    // The seam stands in for `window.confirm`, so the suite never blocks on a
    // real dialog. Cancelling keeps this cycle to the prompt alone.
    const confirm = vi.fn(() => false);
    renderSettings({}, { confirm });

    await user.click(screen.getByRole("button", { name: "Reset everything" }));

    expect(confirm).toHaveBeenCalledWith(
      "This will erase your profile and all goals. Continue?",
    );
  });

  it("erases nothing when the user cancels the confirmation", async () => {
    const user = userEvent.setup();
    saveGoals([aGoal()]);
    const seeded = renderSettings({ salary: 2500 }, { confirm: () => false });

    await user.click(screen.getByRole("button", { name: "Reset everything" }));

    expect(loadProfile().salary).toBe(seeded.salary);
    expect(loadGoals()).toHaveLength(1);
  });

  it("clears the profile and every goal when the user confirms", async () => {
    const user = userEvent.setup();
    saveGoals([aGoal()]);
    renderSettings({ salary: 2500 }, { confirm: () => true });

    await user.click(screen.getByRole("button", { name: "Reset everything" }));

    // A cleared profile is the default one — salary back to 0, which is what
    // makes `hasProfile` false and sends the user back to onboarding.
    expect(loadProfile()).toEqual(defaultProfile);
    expect(loadGoals()).toEqual([]);
  });

  it("returns the user to onboarding when the user confirms", async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    renderSettings({ salary: 2500 }, { confirm: () => true, navigate });

    await user.click(screen.getByRole("button", { name: "Reset everything" }));

    expect(navigate).toHaveBeenCalledWith("/onboarding");
  });

  it("stays on settings when the user cancels", async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    renderSettings({ salary: 2500 }, { confirm: () => false, navigate });

    await user.click(screen.getByRole("button", { name: "Reset everything" }));

    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("SettingsScreen — chrome", () => {
  it("renders the app header and the Settings title", () => {
    renderSettings();
    // Brand wordmark from AppHeader.
    expect(screen.getByRole("link", { name: "Affordo" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /settings/i }),
    ).toBeInTheDocument();
  });
});

describe("SettingsScreen — fields seeded from the profile", () => {
  it("seeds the currency select from the profile", () => {
    renderSettings({ currency: "GBP" });
    const currency = screen.getByLabelText("Currency") as HTMLSelectElement;
    expect(currency.value).toBe("GBP");
  });

  it("seeds every number field from the profile", () => {
    renderSettings({
      salary: 2500,
      hoursPerWeek: 35,
      hoursPerDay: 7,
      paymentsPerYear: 14,
      expenses: 900,
      savings: 5000,
      monthlyContribution: 200,
    });

    expect(
      (screen.getByLabelText("Net monthly salary") as HTMLInputElement).value,
    ).toBe("2500");
    expect(
      (screen.getByLabelText("Hours per week") as HTMLInputElement).value,
    ).toBe("35");
    expect(
      (screen.getByLabelText("Hours per day") as HTMLInputElement).value,
    ).toBe("7");
    expect(
      (screen.getByLabelText("Payments per year") as HTMLInputElement).value,
    ).toBe("14");
    expect(
      (screen.getByLabelText("Monthly fixed expenses") as HTMLInputElement)
        .value,
    ).toBe("900");
    expect(
      (screen.getByLabelText("Current savings") as HTMLInputElement).value,
    ).toBe("5000");
    expect(
      (
        screen.getByLabelText(
          "Extra monthly savings (optional)",
        ) as HTMLInputElement
      ).value,
    ).toBe("200");
  });

  it("shows a blank number field (placeholder visible) when the value is 0", () => {
    renderSettings({ expenses: 0, savings: 0, monthlyContribution: 0 });
    const expenses = screen.getByLabelText(
      "Monthly fixed expenses",
    ) as HTMLInputElement;
    expect(expenses.value).toBe("");
    expect(expenses).toHaveAttribute("placeholder", "0");
  });

  it("seeds the significance-threshold slider and its live label", () => {
    renderSettings({ threshold: 25 });
    const slider = screen.getByLabelText(/significance threshold/i, {
      selector: "input[type=range]",
    }) as HTMLInputElement;
    expect(slider.value).toBe("25");
    expect(screen.getByText(/significance threshold — 25%/i)).toBeInTheDocument();
  });
});

describe("SettingsScreen — editing updates the local draft without persisting", () => {
  it("reflects a salary edit in the draft", async () => {
    const user = userEvent.setup();
    renderSettings({ salary: 2500 });
    const salary = screen.getByLabelText("Net monthly salary");

    await user.clear(salary);
    await user.type(salary, "3100");

    expect((salary as HTMLInputElement).value).toBe("3100");
  });

  it("reflects a currency change in the draft", async () => {
    const user = userEvent.setup();
    renderSettings({ currency: "EUR" });
    const currency = screen.getByLabelText("Currency");

    await user.selectOptions(currency, "USD");

    expect((currency as HTMLSelectElement).value).toBe("USD");
  });

  it("reflects a threshold slider change in its live label", () => {
    renderSettings({ threshold: 10 });
    const slider = screen.getByLabelText(/significance threshold/i, {
      selector: "input[type=range]",
    });

    act(() => {
      // Range inputs don't respond to userEvent.type; set the value directly.
      const el = slider as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!;
      setter.call(el, "30");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(screen.getByText(/significance threshold — 30%/i)).toBeInTheDocument();
  });

  it("does not persist edits to localStorage until Save is pressed", async () => {
    const user = userEvent.setup();
    const seeded = renderSettings({ salary: 2500 });
    const salary = screen.getByLabelText("Net monthly salary");

    await user.clear(salary);
    await user.type(salary, "9999");

    // The stored profile is untouched — editing only mutates the local draft.
    expect(loadProfile().salary).toBe(seeded.salary);
  });
});

describe("SettingsScreen — Save persists the draft and confirms with a toast", () => {
  it("persists an edited field to the profile store when Save is pressed", async () => {
    const user = userEvent.setup();
    renderSettings({ salary: 2500 });
    const salary = screen.getByLabelText("Net monthly salary");

    await user.clear(salary);
    await user.type(salary, "3100");
    await user.click(screen.getByRole("button", { name: /save/i }));

    // The edited draft is now the stored profile.
    expect(loadProfile().salary).toBe(3100);
  });

  it("raises a success toast on Save", async () => {
    const user = userEvent.setup();
    renderSettings({ salary: 2500 });

    await user.click(screen.getByRole("button", { name: /save/i }));

    // The reference confirms the save with a toast reading "Save" (dossier §6).
    expect(await screen.findByRole("status")).toHaveTextContent("Save");
  });

  it("disables Save while the draft has no positive salary, so a save can never eject the guard", async () => {
    const user = userEvent.setup();
    // Seed a valid profile, then clear salary to 0 in the draft.
    renderSettings({ salary: 2500 });
    await user.clear(screen.getByLabelText("Net monthly salary"));

    // With salary at 0 the profile would be guard-invalid (hasProfile false),
    // so Save is disabled — the dossier's "save → stays" can't be violated,
    // matching the reference idiom of expressing validation by disabling the
    // primary action (dossier §7).
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("enables Save once the draft has a positive salary", () => {
    renderSettings({ salary: 2500 });
    expect(screen.getByRole("button", { name: /save/i })).toBeEnabled();
  });

  it("persists every edited field together — not just the last one touched", async () => {
    const user = userEvent.setup();
    renderSettings({ salary: 2500, currency: "EUR" });

    await user.selectOptions(screen.getByLabelText("Currency"), "USD");
    const salary = screen.getByLabelText("Net monthly salary");
    await user.clear(salary);
    await user.type(salary, "4000");
    await user.click(screen.getByRole("button", { name: /save/i }));

    const stored = loadProfile();
    expect(stored.currency).toBe("USD");
    expect(stored.salary).toBe(4000);
  });
});
