// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom(): JSX.Element {
  throw new Error("kaboom");
}

afterEach(() => vi.restoreAllMocks());

describe("ErrorBoundary", () => {
  it("renders its children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("all good")).toBeInTheDocument();
  });

  it("renders the reference recovery screen when a child throws", () => {
    // React logs the caught error; silence it so the run stays readable.
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(
      screen.getByRole("heading", { name: "Something broke", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("The audit could not load.")).toBeInTheDocument();

    // Try again is an in-page control; Go home links back to /.
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
