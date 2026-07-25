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
});
