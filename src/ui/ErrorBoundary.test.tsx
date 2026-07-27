// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom(): JSX.Element {
  throw new Error("kaboom");
}

/** Throws while `gate.blown` is true; renders normally once it's cleared. */
function Flaky({ gate }: { gate: { blown: boolean } }): JSX.Element {
  if (gate.blown) {
    throw new Error("kaboom");
  }
  return <p>recovered</p>;
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

  it("re-renders the children when Try again is clicked", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    const gate = { blown: true };
    render(
      <ErrorBoundary>
        <Flaky gate={gate} />
      </ErrorBoundary>,
    );

    // The first render threw, so the recovery screen is showing.
    expect(
      screen.getByRole("heading", { name: "Something broke" }),
    ).toBeInTheDocument();

    // The underlying fault clears, then the user retries.
    gate.blown = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));

    // Try again clears the boundary and the children render successfully.
    expect(screen.getByText("recovered")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Something broke" }),
    ).toBeNull();
  });
});
