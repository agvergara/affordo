// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppHeader } from "./AppHeader";
import { AffordoProvider } from "../state/AffordoProvider";
import { ThemeProvider } from "../state/ThemeProvider";
import { defaultProfile, saveProfile } from "../state/profile-store";
import { saveTheme } from "../state/theme-store";

beforeEach(() => window.localStorage.clear());
// ThemeProvider writes `.dark` onto the shared document root; strip it between
// tests so a dark case can't leak into the next one's starting theme.
afterEach(() => document.documentElement.classList.remove("dark"));

/**
 * Render AppHeader inside real providers. When `profile` is given it is
 * persisted first, so the provider hydrates to a real profile after mount;
 * `act` flushes that post-mount effect. With no profile the provider stays on
 * the empty default (salary 0 → hasProfile false). `ThemeProvider` wraps it
 * because the header's theme toggle reads the live theme; it starts from
 * whatever `theme-store` holds, so a test seeds dark with `saveTheme("dark")`.
 */
function renderHeader(
  props: Parameters<typeof AppHeader>[0] = {},
  profile?: Partial<typeof defaultProfile>,
) {
  if (profile) saveProfile({ ...defaultProfile, ...profile });
  act(() => {
    render(
      <ThemeProvider>
        <AffordoProvider>
          <AppHeader {...props} />
        </AffordoProvider>
      </ThemeProvider>,
    );
  });
}

describe("AppHeader brand", () => {
  it("renders the Affordo wordmark linking to /goals", () => {
    renderHeader();
    const brand = screen.getByRole("link", { name: "Affordo" });
    expect(brand).toHaveAttribute("href", "/goals");
  });
});

describe("AppHeader settings link", () => {
  it("shows a Settings link to /settings when a profile exists", () => {
    renderHeader({}, { salary: 2000 });
    const link = screen.getByRole("link", { name: "Settings" });
    expect(link).toHaveAttribute("href", "/settings");
  });

  it("hides the Settings link when there is no profile", () => {
    renderHeader();
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
  });
});

describe("AppHeader time-value chip", () => {
  it("shows the formatted hourly rate when a profile exists", () => {
    // 2000/mo × 12 payments ÷ (52 × 40h) = 11.538…/hour → de-DE EUR formatting.
    renderHeader({}, { salary: 2000, currency: "EUR" });
    const chip = screen.getByTestId("time-value");
    expect(chip).toHaveTextContent("Time value:");
    expect(chip).toHaveTextContent("11,54 €");
    expect(chip).toHaveTextContent("/ hour");
  });

  it("formats the rate in the profile currency", () => {
    // Same rate, USD → en-US formatting ($11.54).
    renderHeader({}, { salary: 2000, currency: "USD" });
    expect(screen.getByTestId("time-value")).toHaveTextContent("$11.54");
  });

  it("hides the chip when showTimeValue is false", () => {
    renderHeader({ showTimeValue: false }, { salary: 2000 });
    expect(screen.queryByTestId("time-value")).toBeNull();
  });

  it("hides the chip when there is no profile", () => {
    renderHeader();
    expect(screen.queryByTestId("time-value")).toBeNull();
  });

  it("hides the chip when the hourly rate is not positive", () => {
    // A profile with salary but zero contracted hours → hourly rate 0.
    renderHeader({}, { salary: 2000, hoursPerWeek: 0 });
    expect(screen.queryByTestId("time-value")).toBeNull();
  });
});

describe("AppHeader theme toggle", () => {
  it("offers a control to switch to the dark theme while light is active", () => {
    renderHeader();
    expect(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    ).toBeInTheDocument();
  });

  it("offers a control to switch back to light while dark is active", () => {
    saveTheme("dark");
    renderHeader();
    expect(
      screen.getByRole("button", { name: "Switch to light theme" }),
    ).toBeInTheDocument();
  });

  it("shows the sun icon while the light theme is active", () => {
    renderHeader();
    expect(screen.getByTestId("theme-icon-sun")).toBeInTheDocument();
    expect(screen.queryByTestId("theme-icon-moon")).toBeNull();
  });

  it("shows the moon icon while the dark theme is active", () => {
    saveTheme("dark");
    renderHeader();
    expect(screen.getByTestId("theme-icon-moon")).toBeInTheDocument();
    expect(screen.queryByTestId("theme-icon-sun")).toBeNull();
  });

  it("keeps the icon out of the accessible name", () => {
    // The icon is decorative: the aria-label alone names the control, so a
    // screen reader announces the action once, not the glyph beside it.
    renderHeader();
    expect(screen.getByTestId("theme-icon-sun")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("switches the theme immediately when pressed", async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    );

    // The control now offers the return trip, and wears the dark theme's glyph.
    expect(
      screen.getByRole("button", { name: "Switch to light theme" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("theme-icon-moon")).toBeInTheDocument();
  });

  it("switches back when pressed again", async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Switch to light theme" }),
    );

    expect(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("theme-icon-sun")).toBeInTheDocument();
  });
});

describe("AppHeader chrome", () => {
  it("renders a sticky navigation bar with the reference styling", () => {
    renderHeader();
    const nav = screen.getByRole("navigation");
    expect(nav.className).toContain("sticky");
    expect(nav.className).toContain("top-0");
    expect(nav.className).toContain("border-b");
  });
});
