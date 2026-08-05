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

/**
 * Route-body parity (#127, dossier §6b `__root`). Both controls are plain
 * `<button>`/`<a>` in the reference, not shadcn components, so no base layer
 * contributes classes here — the string is the whole story, unlike `/settings`.
 * `rounded-none` on the button is the one port artifact (#135).
 */
describe("ErrorBoundary route-body parity", () => {
  /** Mount the boundary around a throwing child, silencing React's log. */
  function renderBoundary() {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
  }

  it("centres a max-w-md column on a full-height flex container", () => {
    renderBoundary();
    const shell = screen.getByTestId("error-shell");
    // `justify-center` and `bg-background` are asserted because they are the
    // classes doing the work: without the first the column sits flush left
    // (measured x=16 against x=572), and without the second the screen renders
    // transparent. An earlier revision asserted neither, so a test named
    // "centres a max-w-md column" passed with nothing centred (#138's duel).
    expect(shell).toHaveClass(
      "flex",
      "min-h-screen",
      "items-center",
      "justify-center",
      "bg-background",
      "px-4",
    );
    expect(shell).not.toHaveClass("min-h-dvh");
    expect(shell).not.toHaveClass("flex-col");
    expect(shell).not.toHaveClass("gap-6");
    expect(shell).not.toHaveClass("py-16");
    expect(screen.getByTestId("error-column")).toHaveClass(
      "max-w-md",
      "text-center",
    );
  });

  it("sets the heading at text-4xl, smaller than the 404's numeral", () => {
    // The reference's error heading is `text-4xl` against the 404's `text-8xl`
    // — the quieter of the two screens. Ours had both at `text-6xl sm:text-8xl`.
    renderBoundary();
    const heading = screen.getByRole("heading", { name: "Something broke" });
    expect(heading).toHaveClass("text-4xl");
    expect(heading).not.toHaveClass("text-6xl");
    expect(heading).not.toHaveClass("sm:text-8xl");
  });

  it("sets the caption at text-xs with the reference's top margin", () => {
    renderBoundary();
    const caption = screen.getByText("The audit could not load.");
    expect(caption).toHaveClass("mt-2", "text-xs");
    expect(caption).not.toHaveClass("text-[11px]");
  });

  it("renders Try again solid and Go home outline, the reference's matched pair", () => {
    // The pair inverts: solid hovers to outline, outline hovers to solid. Ours
    // had both bordered at `border-border`, with `Try again` hovering to accent
    // — so the relationship between them was gone, not just the values (§6b).
    renderBoundary();
    const tryAgain = screen.getByRole("button", { name: "Try again" });
    expect(tryAgain).toHaveClass(
      "border-2",
      "border-foreground",
      "bg-foreground",
      "text-background",
      "hover:bg-transparent",
      "hover:text-foreground",
    );
    // #135: the global `button` rule would otherwise round this to 10px, which
    // the reference has no equivalent of. The `<a>` beside it needs no such
    // class, because that rule targets `button` only.
    expect(tryAgain).toHaveClass("rounded-none");
    expect(tryAgain).not.toHaveClass("hover:bg-accent");
    expect(tryAgain).not.toHaveClass("border-border");

    const goHome = screen.getByRole("link", { name: "Go home" });
    expect(goHome).toHaveClass(
      "border-2",
      "border-foreground",
      "text-foreground",
      "hover:bg-foreground",
      "hover:text-background",
    );
    expect(goHome).not.toHaveClass("bg-foreground");
    expect(goHome).not.toHaveClass("border-border");
  });

  it("sizes both controls at the reference's px-4 py-2", () => {
    renderBoundary();
    for (const el of [
      screen.getByRole("button", { name: "Try again" }),
      screen.getByRole("link", { name: "Go home" }),
    ]) {
      expect(el).toHaveClass("px-4", "py-2");
      expect(el).not.toHaveClass("px-6");
      expect(el).not.toHaveClass("py-3");
    }
  });
});
