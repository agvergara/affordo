// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "./Router";
import { useToast } from "./Toast";

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

  it("ignores a trailing slash on a known path", () => {
    navigateTo("/goals/");
    render(<Router />);

    expect(screen.getByRole("heading", { name: /goals/i })).toBeInTheDocument();
    // A trailing slash must not fall through to the 404.
    expect(screen.queryByRole("heading", { name: /404/i })).toBeNull();
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
      screen.getByRole("heading", { name: "Something broke" }),
    ).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("mounts a toast provider at the root so any route can raise a toast", async () => {
    const user = userEvent.setup();
    navigateTo("/");
    function Screen() {
      const { toast } = useToast();
      return <button onClick={() => toast("Saved")}>save</button>;
    }
    // A screen mounted under the router uses useToast without throwing,
    // proving the provider sits above the routed tree at the root.
    render(<Router routes={{ "/": () => <Screen /> }} />);

    await user.click(screen.getByRole("button", { name: "save" }));
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });
});
