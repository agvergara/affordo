// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
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

/** Walk from step 0 to the last step, clicking through the primary control. */
async function reachLastStep(user: ReturnType<typeof userEvent.setup>) {
  await advance(user, "Start →"); // → step 1
  await advance(user, "Continue →"); // → step 2
  await advance(user, "Continue →"); // → step 3
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

    // With nothing stored, finish persists the default profile — and the write
    // is real: the raw record is present after finishing.
    expect(window.localStorage.getItem("affordo.profile")).not.toBeNull();
    expect(loadProfile()).toEqual(defaultProfile);
  });

  it("does not persist or navigate while advancing through earlier steps", async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    renderWizard(navigate);

    await advance(user, "Start →"); // → step 1
    await advance(user, "Continue →"); // → step 2
    await advance(user, "Continue →"); // → step 3 (not yet finished)

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

    await advance(user, "Continue →"); // → step 2
    expect(filled()).toBe(3);

    await advance(user, "Continue →"); // → step 3
    expect(filled()).toBe(4);
  });
});

describe("OnboardingWizard — step 0 Welcome content", () => {
  it("opens with the kicker above the headline", () => {
    renderWizard();
    expect(screen.getByText("Before you buy")).toBeInTheDocument();
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
    expect(screen.queryByText("Before you buy")).not.toBeInTheDocument();
  });
});
