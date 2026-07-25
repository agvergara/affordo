// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
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

  it("renders the 404 screen for an unknown path", () => {
    navigateTo("/nope");
    render(<Router />);

    expect(screen.getByRole("heading", { name: /404/i })).toBeInTheDocument();
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    // Unknown paths must NOT fall through to the calculator.
    expect(screen.queryByLabelText(/monthly net income/i)).toBeNull();
  });

  it("renders the root error boundary when a route throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    navigateTo("/");
    const Boom = (): JSX.Element => {
      throw new Error("kaboom");
    };
    render(<Router routes={{ "/": () => <Boom /> }} />);

    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
