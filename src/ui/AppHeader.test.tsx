// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { AppHeader } from "./AppHeader";
import { AffordoProvider } from "../state/AffordoProvider";
import { defaultProfile, saveProfile } from "../state/profile-store";

beforeEach(() => window.localStorage.clear());

/**
 * Render AppHeader inside a real provider. When `profile` is given it is
 * persisted first, so the provider hydrates to a real profile after mount;
 * `act` flushes that post-mount effect. With no profile the provider stays on
 * the empty default (salary 0 → hasProfile false).
 */
function renderHeader(
  props: Parameters<typeof AppHeader>[0] = {},
  profile?: Partial<typeof defaultProfile>,
) {
  if (profile) saveProfile({ ...defaultProfile, ...profile });
  act(() => {
    render(
      <AffordoProvider>
        <AppHeader {...props} />
      </AffordoProvider>,
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

describe("AppHeader chrome", () => {
  it("renders a sticky navigation bar with the reference styling", () => {
    renderHeader();
    const nav = screen.getByRole("navigation");
    expect(nav.className).toContain("sticky");
    expect(nav.className).toContain("top-0");
    expect(nav.className).toContain("border-b");
  });
});
