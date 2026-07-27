// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsScreen } from "./SettingsScreen";
import { AffordoProvider } from "../state/AffordoProvider";
import {
  defaultProfile,
  loadProfile,
  saveProfile,
  type Profile,
} from "../state/profile-store";

beforeEach(() => window.localStorage.clear());

/**
 * Render SettingsScreen inside a real provider seeded from a persisted profile,
 * so the settings draft hydrates from the same profile the app holds. `act`
 * flushes the provider's post-mount hydration effect.
 */
function renderSettings(profile: Partial<Profile> = {}) {
  const seeded: Profile = { ...defaultProfile, salary: 1300, ...profile };
  saveProfile(seeded);
  act(() => {
    render(
      <AffordoProvider>
        <SettingsScreen />
      </AffordoProvider>,
    );
  });
  return seeded;
}

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

  it("does not persist edits to localStorage (Save lands in a later slice)", async () => {
    const user = userEvent.setup();
    const seeded = renderSettings({ salary: 2500 });
    const salary = screen.getByLabelText("Net monthly salary");

    await user.clear(salary);
    await user.type(salary, "9999");

    // The stored profile is untouched — editing only mutates the local draft.
    expect(loadProfile().salary).toBe(seeded.salary);
  });
});
