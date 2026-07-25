// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Router } from "./Router";

/** Point the SPA at a client path before mounting the Router. */
function navigateTo(path: string) {
  window.history.pushState({}, "", path);
}

beforeEach(() => window.localStorage.clear());
afterEach(() => window.history.pushState({}, "", "/"));

describe("Router", () => {
  it("renders the calculator at /", () => {
    navigateTo("/");
    render(<Router />);

    // The existing calculator is the / route (the e2e suite depends on this).
    expect(
      screen.getByRole("heading", { name: "Affordo", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/monthly net income/i)).toBeInTheDocument();
  });

  it("renders the onboarding placeholder at /onboarding", () => {
    navigateTo("/onboarding");
    render(<Router />);

    expect(
      screen.getByRole("heading", { name: /onboarding/i }),
    ).toBeInTheDocument();
    // Not the calculator.
    expect(screen.queryByLabelText(/monthly net income/i)).toBeNull();
  });

  it("renders the goals placeholder at /goals", () => {
    navigateTo("/goals");
    render(<Router />);

    expect(
      screen.getByRole("heading", { name: /goals/i }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/monthly net income/i)).toBeNull();
  });

  it("renders the settings placeholder at /settings", () => {
    navigateTo("/settings");
    render(<Router />);

    expect(
      screen.getByRole("heading", { name: /settings/i }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/monthly net income/i)).toBeNull();
  });
});
