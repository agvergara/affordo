// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingWizard } from "./OnboardingWizard";
import { AffordoProvider } from "../state/AffordoProvider";
import { ThemeProvider } from "../state/ThemeProvider";
import {
  defaultProfile,
  loadProfile,
  saveProfile,
} from "../state/profile-store";

beforeEach(() => window.localStorage.clear());

/**
 * Mount the wizard inside real providers (AppHeader reads both: the profile for
 * its chip, the theme for its toggle), matching the app root's nesting.
 */
function renderWizard(navigate: (to: string) => void = vi.fn()) {
  act(() => {
    render(
      <ThemeProvider>
        <AffordoProvider>
          <OnboardingWizard navigate={navigate} />
        </AffordoProvider>
      </ThemeProvider>,
    );
  });
}

/**
 * Walk from step 0 to the last step, clicking through the primary control.
 *
 * Income gates (#55): the defaults supply hours and pay periods, but salary
 * starts at zero, so the walk must fill it or `Continue →` stays disabled.
 * Anything asserting the *gate itself* should drive the fields directly rather
 * than lean on this helper.
 */
async function reachLastStep(user: ReturnType<typeof userEvent.setup>) {
  await advance(user, "Start →"); // → step 1
  await fillSalaryIfEmpty(user);
  await advance(user, "Continue →"); // → step 2
  await advance(user, "Continue →"); // → step 3
}

/**
 * Satisfy the income gate without disturbing a seeded salary. Typing
 * unconditionally would append to a seeded value (2400 → 24002000), so a walk
 * that only needs to *get past* the gate fills the field solely when empty.
 */
async function fillSalaryIfEmpty(user: ReturnType<typeof userEvent.setup>) {
  const salary = screen.getByLabelText<HTMLInputElement>("Net monthly salary");
  if (salary.value === "") await user.type(salary, "2000");
}

/** Click the primary (forward) control by its arrow-suffixed label. */
async function advance(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
) {
  await user.click(screen.getByRole("button", { name: label }));
}

describe("OnboardingWizard — persistent chrome", () => {
  it("shows the eyebrow and the first step heading under a time-value-free header", () => {
    renderWizard();
    expect(screen.getByText("Set up your reckoning")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Welcome" }),
    ).toBeInTheDocument();
    // showTimeValue={false}: the time-value chip never renders.
    expect(screen.queryByTestId("time-value")).toBeNull();
  });

  it("renders the counter as 01 / 04 on the first step", () => {
    renderWizard();
    expect(screen.getByText("01 / 04")).toBeInTheDocument();
  });
});

describe("OnboardingWizard — primary control label", () => {
  it("reads Start → on step 0", () => {
    renderWizard();
    expect(screen.getByRole("button", { name: "Start →" })).toBeInTheDocument();
  });

  it("reads Continue → on the middle steps", async () => {
    const user = userEvent.setup();
    renderWizard();
    await advance(user, "Start →");
    expect(
      screen.getByRole("button", { name: "Continue →" }),
    ).toBeInTheDocument();
  });

  it("reads Finish setup → on the last step", async () => {
    const user = userEvent.setup();
    renderWizard();
    await advance(user, "Start →"); // → step 1
    await fillSalaryIfEmpty(user); // the income gate blocks the walk otherwise
    await advance(user, "Continue →"); // → step 2
    await advance(user, "Continue →"); // → step 3
    expect(
      screen.getByRole("button", { name: "Finish setup →" }),
    ).toBeInTheDocument();
    expect(screen.getByText("04 / 04")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rules" })).toBeInTheDocument();
  });
});

describe("OnboardingWizard — Back control", () => {
  it("is disabled on step 0 and reads with a left arrow", () => {
    renderWizard();
    const back = screen.getByRole("button", { name: "← Back" });
    expect(back).toBeDisabled();
  });

  it("becomes enabled off step 0 and reverses the step state", async () => {
    const user = userEvent.setup();
    renderWizard();
    await advance(user, "Start →"); // → step 1 (Income, 02 / 04)
    expect(screen.getByText("02 / 04")).toBeInTheDocument();

    const back = screen.getByRole("button", { name: "← Back" });
    expect(back).toBeEnabled();
    await user.click(back); // → step 0
    expect(screen.getByText("01 / 04")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start →" })).toBeInTheDocument();
  });
});

describe("OnboardingWizard — finish action", () => {
  it("persists the draft and navigates to /goals from the last step", async () => {
    const user = userEvent.setup();
    saveProfile({ ...defaultProfile, salary: 2400 });
    const navigate = vi.fn();
    renderWizard(navigate);

    // Wipe storage AFTER the provider hydrated: only a real write on finish can
    // put the profile back, so this proves the wizard persists (not the seed).
    window.localStorage.clear();

    await reachLastStep(user);
    await advance(user, "Finish setup →");

    // The draft (seeded from the stored profile) is written through the context.
    expect(loadProfile().salary).toBe(2400);
    // …and the user lands on the goals dashboard.
    expect(navigate).toHaveBeenCalledWith("/goals");
  });

  it("seeds the draft from an existing stored profile", async () => {
    const user = userEvent.setup();
    saveProfile({ ...defaultProfile, salary: 1800, threshold: 25 });
    renderWizard();

    window.localStorage.clear(); // discard the seed source; finish must re-write

    await reachLastStep(user);
    await advance(user, "Finish setup →");

    // Finish re-persists exactly the stored profile, untouched by defaults.
    const saved = loadProfile();
    expect(saved.salary).toBe(1800);
    expect(saved.threshold).toBe(25);
  });

  it("seeds the draft from defaults when no profile is stored", async () => {
    const user = userEvent.setup();
    // No saveProfile call: storage is empty (cleared in beforeEach).
    renderWizard();

    await reachLastStep(user);
    await advance(user, "Finish setup →");

    // With nothing stored, finish persists the defaults for every field the
    // user did not touch — and the write is real: the raw record is present
    // after finishing. Salary is the exception by necessity: the income gate
    // (#55) will not let the wizard reach the last step at zero, so the only
    // reachable "defaults" profile is one with a salary typed in.
    expect(window.localStorage.getItem("affordo.profile")).not.toBeNull();
    expect(loadProfile()).toEqual({ ...defaultProfile, salary: 2000 });
  });

  it("does not persist or navigate while advancing through earlier steps", async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    renderWizard(navigate);

    await advance(user, "Start →"); // → step 1
    await fillSalaryIfEmpty(user); // satisfy the income gate so the walk moves
    await advance(user, "Continue →"); // → step 2
    await advance(user, "Continue →"); // → step 3 (not yet finished)

    // Prove the walk actually moved before asserting the negatives: clicking a
    // disabled control is a silent no-op, so a gate that never opened would
    // leave this test passing from step 1 with nothing to say.
    expect(screen.getByText("04 / 04")).toBeInTheDocument();

    // Storage untouched (empty → loadProfile returns a fresh default) and no nav.
    expect(window.localStorage.getItem("affordo.profile")).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("OnboardingWizard — progress bar", () => {
  it("fills segments up to the current step", async () => {
    const user = userEvent.setup();
    renderWizard();

    const filled = () =>
      document.querySelectorAll<HTMLElement>(
        '[data-testid="progress-bar"] > span.bg-foreground',
      ).length;

    // Step 0: only the first segment is filled.
    expect(filled()).toBe(1);

    await advance(user, "Start →"); // → step 1
    expect(filled()).toBe(2);

    await fillSalaryIfEmpty(user); // the income gate blocks the walk otherwise
    await advance(user, "Continue →"); // → step 2
    expect(filled()).toBe(3);

    await advance(user, "Continue →"); // → step 3
    expect(filled()).toBe(4);
  });
});

describe("OnboardingWizard — step 0 Welcome content", () => {
  it("opens with the kicker above the headline", () => {
    renderWizard();
    const kicker = screen.getByText("Before you buy");
    const headline = screen.getByText(
      "Measure any purchase in hours of your life.",
    );
    const body = screen.getByText(
      "Affordo turns your salary into a time budget, then weighs every goal against it. Set your income once, then add a goal any time you're tempted to spend.",
    );
    expect(kicker).toBeInTheDocument();
    // The name promises a stacking order, so assert it rather than mere
    // presence: §15 stacks kicker → headline → body, and presence-only
    // assertions leave the blocks freely interchangeable.
    //
    // `toBe`, not `toBeTruthy`: a bitmask test also passes for containment
    // (a nested node returns CONTAINED_BY|FOLLOWING = 20, and 20 & 4 is
    // truthy), so only the exact sibling value pins "stacked below".
    expect(kicker.compareDocumentPosition(headline)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(headline.compareDocumentPosition(body)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("states the premise as the headline", () => {
    renderWizard();
    expect(
      screen.getByText("Measure any purchase in hours of your life."),
    ).toBeInTheDocument();
  });

  it("explains the premise in the body copy", () => {
    renderWizard();
    expect(
      screen.getByText(
        "Affordo turns your salary into a time budget, then weighs every goal against it. Set your income once, then add a goal any time you're tempted to spend.",
      ),
    ).toBeInTheDocument();
  });

  it("asks for nothing — the welcome step has no fields to fill", () => {
    renderWizard();
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
  });

  it("leaves the primary control enabled, since nothing here gates it", () => {
    renderWizard();
    expect(screen.getByRole("button", { name: "Start →" })).toBeEnabled();
  });

  it("drops the welcome copy once the user starts", async () => {
    renderWizard();
    const user = userEvent.setup();
    await advance(user, "Start →");
    // All three blocks, not just the kicker: confining one and leaking the
    // other two is a mutation the kicker-only assertion could not see.
    expect(screen.queryByText("Before you buy")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Measure any purchase in hours of your life."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Affordo turns your salary into a time budget, then weighs every goal against it. Set your income once, then add a goal any time you're tempted to spend.",
      ),
    ).not.toBeInTheDocument();
  });
});

describe("OnboardingWizard — step 1 Income fields", () => {
  it("offers the three currencies with their symbols", async () => {
    renderWizard();
    const user = userEvent.setup();
    await advance(user, "Start →");
    const select = screen.getByLabelText("Currency");
    expect(
      Array.from(select.querySelectorAll("option")).map((o) => o.textContent),
    ).toEqual(["EUR — €", "GBP — £", "USD — $"]);
  });

  it("asks for salary, both hour figures and the pay periods", async () => {
    renderWizard();
    const user = userEvent.setup();
    await advance(user, "Start →");
    for (const label of [
      "Net monthly salary",
      "Hours per week",
      "Hours per day",
      "Payments per year",
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it("explains the extra pay periods with the reference hint", async () => {
    renderWizard();
    const user = userEvent.setup();
    await advance(user, "Start →");
    expect(
      screen.getByText("Use 14 for Spanish-style extra payments."),
    ).toBeInTheDocument();
  });

  it("puts the cursor in salary so the user can type straight away", async () => {
    renderWizard();
    const user = userEvent.setup();
    await advance(user, "Start →");
    expect(screen.getByLabelText("Net monthly salary")).toHaveFocus();
  });
});

describe("OnboardingWizard — step 1 gating", () => {
  /** Reach Income with the four gating fields at their default values. */
  async function reachIncome() {
    renderWizard();
    const user = userEvent.setup();
    await advance(user, "Start →");
    return user;
  }

  const primary = () => screen.getByRole("button", { name: "Continue →" });

  it("refuses to continue while the salary is still unfilled", async () => {
    await reachIncome();
    // Defaults give hours 40/8 and 12 payments, so salary is the only figure
    // still at zero — the gate must hold on it alone.
    expect(primary()).toBeDisabled();
  });

  it("lets the user continue once every income figure is above zero", async () => {
    const user = await reachIncome();
    await user.type(screen.getByLabelText("Net monthly salary"), "2000");
    expect(primary()).toBeEnabled();
  });

  it.each([
    ["Hours per week", "Net monthly salary"],
    ["Hours per day", "Net monthly salary"],
    ["Payments per year", "Net monthly salary"],
  ])("refuses to continue when %s is cleared", async (cleared, filled) => {
    const user = await reachIncome();
    await user.type(screen.getByLabelText(filled), "2000");
    expect(primary()).toBeEnabled();

    await user.clear(screen.getByLabelText(cleared));
    expect(primary()).toBeDisabled();
  });

  it("stays on the income step while the gate holds", async () => {
    const user = await reachIncome();
    await user.click(primary());
    expect(screen.getByLabelText("Net monthly salary")).toBeInTheDocument();
    expect(screen.getByText("02 / 04")).toBeInTheDocument();
  });

  it("says nothing about why — the gate is quiet, not explanatory", async () => {
    await reachIncome();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/required|must be|invalid/i),
    ).not.toBeInTheDocument();
  });
});

describe("OnboardingWizard — income fields reach the saved profile", () => {
  /**
   * Every income field is driven to a value distinct from every other, then
   * the wizard is finished and storage read back. Distinct values are the
   * point: a flat `salary > 0 && hoursPerWeek > 0 && …` gate cannot tell which
   * key a field writes, so two fields crossed onto one key stays green under
   * gating tests alone.
   */
  async function fillIncomeAndFinish(currency?: string) {
    const user = userEvent.setup();
    renderWizard();
    await advance(user, "Start →");
    if (currency) {
      await user.selectOptions(screen.getByLabelText("Currency"), currency);
    }
    await user.type(screen.getByLabelText("Net monthly salary"), "2500");
    await user.clear(screen.getByLabelText("Hours per week"));
    await user.type(screen.getByLabelText("Hours per week"), "37");
    await user.clear(screen.getByLabelText("Hours per day"));
    await user.type(screen.getByLabelText("Hours per day"), "7");
    await user.clear(screen.getByLabelText("Payments per year"));
    await user.type(screen.getByLabelText("Payments per year"), "14");
    await advance(user, "Continue →"); // → step 2
    await advance(user, "Continue →"); // → step 3
    await advance(user, "Finish setup →");
    return loadProfile();
  }

  it("writes each numeric field to its own key, uncrossed", async () => {
    const saved = await fillIncomeAndFinish();
    expect(saved.salary).toBe(2500);
    expect(saved.hoursPerWeek).toBe(37);
    expect(saved.hoursPerDay).toBe(7);
    expect(saved.paymentsPerYear).toBe(14);
  });

  it("writes the chosen currency, which no other field can stand in for", async () => {
    const saved = await fillIncomeAndFinish("GBP");
    expect(saved.currency).toBe("GBP");
  });

  it("keeps the seeded currency when the user does not change it", async () => {
    const saved = await fillIncomeAndFinish();
    expect(saved.currency).toBe("EUR");
  });
});

describe("OnboardingWizard — step 2 Expenses", () => {
  /** Reach Expenses through the income gate. */
  async function reachExpenses() {
    renderWizard();
    const user = userEvent.setup();
    await advance(user, "Start →");
    await fillSalaryIfEmpty(user);
    await advance(user, "Continue →");
    return user;
  }

  it("asks for monthly fixed expenses, with the reference hint", async () => {
    await reachExpenses();
    expect(screen.getByText("03 / 04")).toBeInTheDocument();
    // The heading needs its own assertion: the counter derives from
    // `steps.length`, so it reads 03 / 04 whatever this step is called.
    expect(
      screen.getByRole("heading", { name: "Expenses" }),
    ).toBeInTheDocument();
    const field = screen.getByLabelText("Monthly fixed expenses");
    expect(field).toBeInTheDocument();
    // §16 records `placeholder="0"`, and `value || ""` blanks a zero so the
    // placeholder is what the user actually reads on an untouched field.
    expect(field).toHaveAttribute("placeholder", "0");
    expect(
      screen.getByText("Rent, groceries, subscriptions, transport, utilities."),
    ).toBeInTheDocument();
  });

  it("shows only its own field — income does not leak forward", async () => {
    await reachExpenses();
    // Each step body is conditional on the exact step index. Widening any of
    // those conditions stacks two steps on one screen, which nothing else here
    // can see. Same mutation class as #106's "drops the welcome copy once the
    // user starts", one step later.
    expect(
      screen.queryByLabelText("Net monthly salary"),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Currency")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Hours per week")).not.toBeInTheDocument();
  });

  it("does not leak its own field forward onto the rules step", async () => {
    const user = await reachExpenses();
    await advance(user, "Continue →"); // → step 3
    expect(screen.getByText("04 / 04")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Monthly fixed expenses"),
    ).not.toBeInTheDocument();
  });

  it("puts the cursor in the expenses field", async () => {
    await reachExpenses();
    expect(screen.getByLabelText("Monthly fixed expenses")).toHaveFocus();
  });

  it("lets the user continue without entering any expenses", async () => {
    await reachExpenses();
    // Expenses are optional-but-encouraged: §16 records this step as never
    // gated, so an untouched zero must still advance.
    expect(screen.getByLabelText("Monthly fixed expenses")).toHaveValue(null);
    expect(screen.getByRole("button", { name: "Continue →" })).toBeEnabled();
  });

  it("writes the entered expenses to the saved profile", async () => {
    const user = await reachExpenses();
    await user.type(screen.getByLabelText("Monthly fixed expenses"), "1250");
    await advance(user, "Continue →"); // → step 3
    await advance(user, "Finish setup →");
    expect(loadProfile().expenses).toBe(1250);
  });
});

describe("OnboardingWizard — step 3 Rules", () => {
  /** Reach Rules through the income gate. */
  async function reachRules() {
    renderWizard();
    const user = userEvent.setup();
    await advance(user, "Start →");
    await fillSalaryIfEmpty(user);
    await advance(user, "Continue →"); // → step 2
    await advance(user, "Continue →"); // → step 3
    return user;
  }

  /** The threshold slider, addressed through its interpolated label. */
  const slider = (pct: number) =>
    screen.getByLabelText(`Significance threshold — ${pct}%`);

  it("names the step and offers the finish action", async () => {
    await reachRules();
    expect(screen.getByText("04 / 04")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rules" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Finish setup →" }),
    ).toBeInTheDocument();
  });

  it("carries the live threshold percentage in the slider's own label", async () => {
    await reachRules();
    // defaultProfile.threshold is 10, so the label must read it rather than
    // hardcode a number.
    expect(slider(10)).toBeInTheDocument();
    fireEvent.change(slider(10), { target: { value: "25" } });
    expect(slider(25)).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Significance threshold — 10%"),
    ).not.toBeInTheDocument();
  });

  it("bounds the threshold to 1..50 in whole percentage points", async () => {
    await reachRules();
    // Address it by ARIA role, not just by label: `min`/`max`/`step` survive on
    // a text input, so asserting the attributes alone proves three attributes
    // exist somewhere — not that the control is a slider or bounded at all.
    const s = screen.getByRole("slider", {
      name: "Significance threshold — 10%",
    });
    expect(s).toHaveAttribute("min", "1");
    expect(s).toHaveAttribute("max", "50");
    expect(s).toHaveAttribute("step", "1");
  });

  it("sits the thumb on the threshold, not on some other figure", async () => {
    const user = await reachRules();
    expect(slider(10)).toHaveValue("10");
    // Bound to the wrong key, the label still reads the threshold while the
    // thumb tracks something else — so the label assertions cannot catch it.
    await user.type(screen.getByLabelText("Current savings"), "4000");
    expect(slider(10)).toHaveValue("10");
  });

  it("explains what the threshold does", async () => {
    await reachRules();
    expect(
      screen.getByText(
        "Purchases above this % of your monthly income are flagged.",
      ),
    ).toBeInTheDocument();
  });

  it("asks for savings and optional extra savings, with the reference hint", async () => {
    await reachRules();
    const savings = screen.getByLabelText("Current savings");
    const contribution = screen.getByLabelText(
      "Extra monthly savings (optional)",
    );
    expect(savings).toHaveAttribute("placeholder", "0");
    expect(contribution).toHaveAttribute("placeholder", "0");
    // §16 gives this hint to the contribution field only. Asserting mere
    // presence lets it sit under either field — the two are side by side in one
    // grid, so mis-attachment is invisible without checking whose it is.
    const hint = screen.getByText(
      "Money you consistently set aside on top of expenses.",
    );
    expect(contribution.closest("div")).toContainElement(hint);
    expect(savings.closest("div")).not.toContainElement(hint);
  });

  it("writes threshold, savings and contribution to their own keys", async () => {
    const user = await reachRules();
    fireEvent.change(slider(10), { target: { value: "30" } });
    await user.type(screen.getByLabelText("Current savings"), "4000");
    await user.type(
      screen.getByLabelText("Extra monthly savings (optional)"),
      "150",
    );
    await advance(user, "Finish setup →");

    const saved = loadProfile();
    expect(saved.threshold).toBe(30);
    expect(saved.savings).toBe(4000);
    expect(saved.monthlyContribution).toBe(150);
    // …and the earlier steps' figures are still intact, uncrossed.
    expect(saved.salary).toBe(2000);
  });

  it("shows only its own fields — expenses does not leak forward", async () => {
    await reachRules();
    expect(
      screen.queryByLabelText("Monthly fixed expenses"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Net monthly salary"),
    ).not.toBeInTheDocument();
  });

  it("does not leak its own fields back onto earlier steps", async () => {
    const user = await reachRules();
    await user.click(screen.getByRole("button", { name: "← Back" })); // → step 2
    expect(screen.getByText("03 / 04")).toBeInTheDocument();
    expect(screen.queryByLabelText("Current savings")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Extra monthly savings (optional)"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Significance threshold/),
    ).not.toBeInTheDocument();
  });
});

describe("OnboardingWizard — slide-up between steps", () => {
  /** The chrome that must survive a step change untouched. */
  const chrome = () => ({
    header: screen.getByRole("navigation"),
    // The eyebrow / step heading / counter block. Its *contents* change per
    // step, which makes it the easiest chrome to key by mistake — and the
    // counter clause of the criterion lives here, on the ancestor rather than
    // on the counter span itself.
    head: screen.getByTestId("step-head"),
    progress: screen.getByTestId("progress-bar"),
    footer: screen.getByRole("button", { name: "← Back" }).parentElement,
  });

  /**
   * Assert the step body is a genuinely different element after `move` — not
   * the same node with new children. That distinction is the whole mechanism: a
   * CSS animation restarts on remount and never on re-render, so a class
   * assertion alone proves nothing about whether the transition plays.
   */
  async function expectRemount(label: string, move: () => Promise<void>) {
    const before = screen.getByTestId("step-body");
    await move();
    const after = screen.getByTestId("step-body");
    expect(after, label).not.toBe(before);
    expect(before, label).not.toBeInTheDocument();
  }

  it("remounts the step body on every step change, re-running the animation", async () => {
    renderWizard();
    const user = userEvent.setup();

    // Every transition, not just the first: a key that merely distinguishes
    // step 0 from the rest — which is what you would write to stop remounting
    // inputs between form steps — leaves 0→1 remounting while 1→2 and 2→3
    // silently reuse the node and stop animating.
    await expectRemount("0→1", async () => {
      await advance(user, "Start →");
    });
    await fillSalaryIfEmpty(user);
    await expectRemount("1→2", async () => {
      await advance(user, "Continue →");
    });
    await expectRemount("2→3", async () => {
      await advance(user, "Continue →");
    });
    expect(screen.getByText("04 / 04")).toBeInTheDocument();
  });

  it("holds the step body still while the user types", async () => {
    renderWizard();
    const user = userEvent.setup();
    await advance(user, "Start →");
    const before = screen.getByTestId("step-body");

    await user.type(screen.getByLabelText("Net monthly salary"), "2000");

    // Remount is what replays the animation, so a key that changes on every
    // render — `Math.random()` being the obvious way to get one — would replay
    // it on every keystroke. That currently only fails elsewhere, via
    // persistence tests whose multi-character typing gets mangled; asserting it
    // here makes the "only on step change" half of the invariant deliberate
    // rather than protected by accident.
    expect(screen.getByTestId("step-body")).toBe(before);
  });

  it("remounts on the way back too, so returning also animates", async () => {
    renderWizard();
    const user = userEvent.setup();
    await advance(user, "Start →");
    await fillSalaryIfEmpty(user);
    await advance(user, "Continue →"); // → step 2

    // §17 gives backward step changes the same slide-in as forward ones, and
    // nothing else here exercises ← Back.
    await expectRemount("2→1", async () => {
      await user.click(screen.getByRole("button", { name: "← Back" }));
    });
    expect(screen.getByText("02 / 04")).toBeInTheDocument();
    expect(screen.getByTestId("step-body")).toHaveClass("animate-slide-up");
  });

  it("carries the slide-up animation on the step body", async () => {
    renderWizard();
    const user = userEvent.setup();
    // A class assertion, under the narrow precedent PR #94 set: the animation
    // *is* the acceptance criterion, and jsdom runs no CSS, so the utility that
    // declares it is the only observable.
    expect(screen.getByTestId("step-body")).toHaveClass("animate-slide-up");

    // …and on every *incoming* step, which is what the criterion is about.
    // Asserting at initial mount alone lets a class conditional on the first
    // step kill the transition for every real step change and still pass; and
    // stopping short of the last step lets one conditional on `isLast` through.
    await advance(user, "Start →");
    expect(screen.getByTestId("step-body")).toHaveClass("animate-slide-up");
    await fillSalaryIfEmpty(user);
    await advance(user, "Continue →");
    expect(screen.getByTestId("step-body")).toHaveClass("animate-slide-up");
    await advance(user, "Continue →");
    expect(screen.getByTestId("step-body")).toHaveClass("animate-slide-up");
    expect(screen.getByText("04 / 04")).toBeInTheDocument();
  });

  it("keeps the header, progress bar and footer through a step change", async () => {
    renderWizard();
    const user = userEvent.setup();
    const before = chrome();

    await advance(user, "Start →");

    // Same nodes, so nothing outside the step body can re-animate.
    const after = chrome();
    expect(after.header).toBe(before.header);
    expect(after.head).toBe(before.head);
    expect(after.progress).toBe(before.progress);
    expect(after.footer).toBe(before.footer);
  });

  it("does not animate the chrome", () => {
    renderWizard();
    const { header, head, progress, footer } = chrome();
    expect(header).not.toHaveClass("animate-slide-up");
    expect(progress).not.toHaveClass("animate-slide-up");
    expect(footer).not.toHaveClass("animate-slide-up");
    // The counter moves with the step but is chrome, not step body — asserted
    // on its own span *and* on the block that wraps it, since animating the
    // ancestor is the way the counter actually ends up moving.
    expect(head).not.toHaveClass("animate-slide-up");
    expect(screen.getByText("01 / 04")).not.toHaveClass("animate-slide-up");
  });
});

/**
 * Component parity for the wizard (#139).
 *
 * `/onboarding`'s route file is a 14-line shim in the reference — the screen
 * lives in `components/affordo/OnboardingWizard.tsx`. That is why #127's
 * route-body pass covered five routes and still missed this one: there was no
 * route body to tear down.
 *
 * The class *strings* here were already faithful. What was missing is what
 * #134, #137 and #138 each found the hard way: the classes the reference's
 * shadcn `<Button>`/`<Input>` contribute, which survive tailwind-merge and
 * never appear in the route's own source.
 */
describe("OnboardingWizard component parity", () => {
  /** Step 0 is the welcome copy; the fields start on step 1. */
  async function reachFields() {
    renderWizard();
    const user = userEvent.setup();
    await advance(user, "Start →");
    return user;
  }

  it("gives the inputs the height and desktop type size <Input> contributes", async () => {
    // `h-9` and `md:text-sm` survive tailwind-merge against `bigInputClass`:
    // it sets padding but no height, and `text-3xl` displaces the base's
    // `text-base` but not its `md:` variant. Identical to what #137 found on
    // /settings, where the string was also already correct.
    await reachFields();
    const input = screen.getByLabelText("Net monthly salary");
    expect(input).toHaveClass("h-9");
    expect(input).toHaveClass("md:text-sm");
  });

  it("gives the primary CTA the button base's height and shadow", () => {
    // Measured 65px before this; the reference merges to `h-9 px-6 py-6` = 48px.
    renderWizard();
    const cta = screen.getByRole("button", { name: /Start/ });
    expect(cta).toHaveClass("h-9");
    expect(cta).toHaveClass("shadow");
    expect(cta).toHaveClass("inline-flex");
    expect(cta).toHaveClass("justify-center");
  });

  it("gives Back the ghost button's geometry rather than no box at all", () => {
    // `variant="ghost"` contributes `h-9 px-4 py-2 rounded-md`. Ours had `p-0`,
    // so it had no hit area beyond its own text.
    renderWizard();
    const back = screen.getByRole("button", { name: /Back/ });
    expect(back).toHaveClass("h-9");
    expect(back).toHaveClass("px-4");
    expect(back).toHaveClass("py-2");
    expect(back).toHaveClass("rounded-md");
    expect(back).not.toHaveClass("p-0");
  });

  it("leaves Back at the inherited foreground, not muted", () => {
    // The reference's Back className is `font-mono text-[11px] font-bold
    // uppercase tracking-widest` — no colour at all, so it inherits
    // `--foreground`, and the ghost variant supplies the hover. Ours painted it
    // `text-muted-foreground` and hovered to foreground, which inverts the
    // relationship: the reference's Back is the *stronger* of the two states at
    // rest.
    renderWizard();
    const back = screen.getByRole("button", { name: /Back/ });
    expect(back).not.toHaveClass("text-muted-foreground");
    expect(back).not.toHaveClass("hover:text-foreground");
    expect(back).toHaveClass("hover:bg-accent");
    expect(back).toHaveClass("hover:text-accent-foreground");
  });
});

/**
 * `inputMode="decimal"` is on salary and expenses only in the reference
 * (`OnboardingWizard.tsx:130`, `:176`) — not on savings or the monthly
 * contribution, which are money too. Inconsistent, and therefore required
 * (#108, #39's bar).
 */
describe("OnboardingWizard decimal keypad hint", () => {
  it("puts inputMode on salary but not on the hours fields beside it", async () => {
    renderWizard();
    const user = userEvent.setup();
    await advance(user, "Start →");
    expect(screen.getByLabelText("Net monthly salary")).toHaveAttribute(
      "inputMode",
      "decimal",
    );
    expect(screen.getByLabelText("Hours per week")).not.toHaveAttribute(
      "inputMode",
    );
  });

  it("types every numeric field as a number input", async () => {
    renderWizard();
    const user = userEvent.setup();
    await advance(user, "Start →");
    for (const label of ["Net monthly salary", "Hours per week"]) {
      expect(screen.getByLabelText(label)).toHaveAttribute("type", "number");
    }
  });
});
