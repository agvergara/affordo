// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsScreen, type Confirm, type Navigate } from "./SettingsScreen";
import { AffordoProvider } from "../state/AffordoProvider";
import { ThemeProvider } from "../state/ThemeProvider";
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
  props: { navigate?: Navigate; confirm?: Confirm } = {},
) {
  const seeded: Profile = { ...defaultProfile, salary: 1300, ...profile };
  saveProfile(seeded);
  act(() => {
    render(
      <ThemeProvider>
        <ToastProvider>
          <AffordoProvider>
            {/*
              Both seams are stubbed by default, so a test that doesn't care about
              them can never fall through to the real `window.confirm` /
              `window.location.replace` — the latter makes jsdom log
              "Not implemented: navigation" and would leave a real navigation
              attempt in the suite. An explicit prop still wins via the spread.
            */}
            <SettingsScreen
              navigate={vi.fn()}
              confirm={() => false}
              {...props}
            />
          </AffordoProvider>
        </ToastProvider>
      </ThemeProvider>,
    );
  });
  return seeded;
}

/**
 * Route-body parity (#127, dossier §6b `/settings`).
 *
 * Class assertions under #94's narrow exception — the geometry *is* the
 * requirement and jsdom applies no stylesheet. Values read off
 * `agvergara/dream-purchase-planner`'s `src/routes/settings.tsx`, not from the
 * dossier's component teardowns.
 *
 * #134's duel is the reason the button assertions name `h-9` and `border-0`:
 * the reference renders shadcn `<Button>`/`<Input>` primitives whose base layer
 * contributes classes that survive tailwind-merge, and this port carries a
 * legacy global `button`/`input` rule the reference has no equivalent of
 * (#135). Copying the reference's `className` alone reproduces the string and
 * not the pixels.
 */
describe("SettingsScreen route-body parity", () => {
  it("opens with the rule-topped masthead and the Affordo eyebrow", () => {
    // `mb-10 border-t-4 border-foreground pt-6` with the brand eyebrow above
    // the title (`settings.tsx:66`). Ours had a bare `<h1>` and no eyebrow —
    // the eyebrow is copy, not chrome, so its absence was a missing string.
    renderSettings();
    const masthead = screen.getByTestId("settings-masthead");
    expect(masthead).toHaveClass(
      "mb-10",
      "border-t-4",
      "border-foreground",
      "pt-6",
    );
    expect(within(masthead).getByText("Affordo")).toBeInTheDocument();
    expect(
      within(masthead).getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
  });

  it("pads the main column at py-10", () => {
    renderSettings();
    const main = screen.getByRole("main");
    expect(main).toHaveClass("max-w-2xl", "py-10");
    expect(main).not.toHaveClass("py-16");
  });

  it("sets every field label at the reference size and weight", () => {
    // `text-[10px]` *with* `font-bold` (`settings.tsx:77`). Ours was
    // `text-[11px]` with no weight — lighter and larger, in both directions.
    renderSettings();
    for (const label of screen.getAllByTestId("settings-field-label")) {
      expect(label).toHaveClass("text-[10px]", "font-bold");
      expect(label).not.toHaveClass("text-[11px]");
    }
  });

  it("draws the inputs on the reference's 2px underline", () => {
    // The reference's shared `bigInput` is `border-0 border-b-2 … px-0 …
    // rounded-none shadow-none`. `border-0` is load-bearing here for the same
    // reason it is on /goals' add button: theme.css puts a 1px border on every
    // input, which `border-b-2` alone would not clear from the other 3 sides.
    renderSettings();
    const input = screen.getByLabelText("Net monthly salary");
    expect(input).toHaveClass("border-0", "border-b-2", "px-0", "rounded-none");
    expect(input).not.toHaveClass("border-b");
    // `h-9` and `md:text-sm` come from shadcn's `<Input>` base, not from the
    // route's string, and both survive tailwind-merge against it. Without them
    // these inputs rendered 50px tall at 24px type against the reference's 36px
    // at 14px from 768px up (#137's duel). Measured, not inferred.
    expect(input).toHaveClass("h-9", "md:text-sm");
  });

  it("puts the significance threshold last, after the savings pair", () => {
    // Reference field order (`settings.tsx:75-146`): currency, salary, the
    // hours/payments trio, expenses, savings + contribution, then threshold.
    // Ours followed the wizard's order and put threshold before the pair.
    renderSettings();
    const order = screen
      .getAllByTestId("settings-field-label")
      .map((el) => el.textContent ?? "");
    // Asserted as *last*, not merely after the savings field — an earlier
    // revision checked only the ordering against `Current savings`, so moving
    // the threshold between the two savings fields passed (#137's duel).
    expect(order[order.length - 1]).toMatch(/^Significance threshold/);
    expect(order).toEqual([
      "Currency",
      "Net monthly salary",
      "Hours per week",
      "Hours per day",
      "Payments per year",
      "Monthly fixed expenses",
      "Current savings",
      "Extra monthly savings (optional)",
      `Significance threshold — 10%`,
    ]);
  });

  it("renders no hint paragraphs on this screen", () => {
    // The reference's settings route renders labels and controls only. Ours
    // carried four hints borrowed from the wizard, where they do belong (§16).
    renderSettings();
    // Asserted on the strings, all four of them. An earlier revision queried a
    // `settings-hint` testid that has never existed in this repo, so it read
    // `[].length === 0` and would have passed with every hint still rendered
    // (#137's duel).
    for (const hint of [
      /Use 14 for Spanish-style extra payments/,
      /Rent, groceries, subscriptions, transport, utilities/,
      /Money you consistently set aside on top of expenses/,
      /Purchases above this % of your monthly income are flagged/,
    ]) {
      expect(screen.queryByText(hint)).toBeNull();
    }
    // Non-vacuous: the labels those hints sat under are still here, so an empty
    // render could not make the four assertions above pass.
    expect(screen.getAllByTestId("settings-field-label").length).toBe(9);
  });

  it("sizes Save as the reference's primary CTA", () => {
    renderSettings({ salary: 2500 });
    const save = screen.getByRole("button", { name: /save/i });
    expect(save).toHaveClass("rounded-none", "px-6", "py-6", "font-bold");
    expect(save).not.toHaveClass("rounded-md", "py-3");
    expect(save).toHaveClass("h-9", "border-0");
  });

  it("gives Reset the ghost button's own geometry", () => {
    // `variant="ghost"` contributes `h-9 px-4 py-2` and `hover:bg-accent`;
    // the route's className overrides only the text colour. Ours had `p-0`,
    // so it had no hit area beyond its text.
    renderSettings();
    const reset = screen.getByRole("button", { name: "Reset everything" });
    expect(reset).toHaveClass("h-9", "px-4", "py-2", "hover:bg-accent");
    expect(reset).not.toHaveClass("p-0");
    // `rounded-md` survives from the Button base: the ghost variant carries no
    // `rounded-*`, and neither does the route's className, so there is nothing
    // for tailwind-merge to displace it with. An earlier revision wrote
    // `rounded-none` here, which was invented (#137's duel).
    expect(reset).toHaveClass("rounded-md");
    expect(reset).not.toHaveClass("rounded-none");
  });
});

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
    expect(
      screen.getByText(/significance threshold — 25%/i),
    ).toBeInTheDocument();
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

    expect(
      screen.getByText(/significance threshold — 30%/i),
    ).toBeInTheDocument();
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

  it("never disables Save, even when the draft would fail the profile guard", async () => {
    const user = userEvent.setup();
    renderSettings({ salary: 2500 });
    await user.clear(screen.getByLabelText("Net monthly salary"));

    // The reference's Save has no disabled state (`settings.tsx:155`). An
    // earlier revision added one here to stop a zero-salary save ejecting the
    // user via the `/settings` guard — but that eject is the reference's own
    // behaviour, and #39's bar is behaviour-for-behaviour with no carve-out for
    // behaviour that looks like a mistake (#136).
    expect(screen.getByRole("button", { name: /save/i })).toBeEnabled();
  });

  it("persists a zero salary, which is what makes the guard eject", async () => {
    const user = userEvent.setup();
    renderSettings({ salary: 2500 });
    await user.clear(screen.getByLabelText("Net monthly salary"));
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Pins the consequence rather than leaving it incidental: the write really
    // does happen, so `hasProfile` really does go false. `Router`'s guard is
    // what acts on it, and its own tests cover the redirect.
    expect(loadProfile().salary).toBe(0);
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
