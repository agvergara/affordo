// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingWizard } from "./OnboardingWizard";
import { AffordoProvider } from "../state/AffordoProvider";

beforeEach(() => window.localStorage.clear());

/** Mount the wizard inside a real provider (AppHeader reads it). */
function renderWizard() {
  act(() => {
    render(
      <AffordoProvider>
        <OnboardingWizard />
      </AffordoProvider>,
    );
  });
}

/** Click the primary (forward) control by its arrow-suffixed label. */
async function advance(user: ReturnType<typeof userEvent.setup>, label: string) {
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
