// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotFoundScreen } from "./Placeholder";

describe("NotFoundScreen", () => {
  it("shows the 404 numeral, Page not found, and a Go home link to /", () => {
    render(<NotFoundScreen />);

    expect(
      screen.getByRole("heading", { name: "404", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();

    const home = screen.getByRole("link", { name: "Go home" });
    expect(home).toHaveAttribute("href", "/");
  });
});

/**
 * Route-body parity (#127, dossier §6b `__root`). Class assertions under #94's
 * narrow exception; values read off the reference's `src/routes/__root.tsx`.
 *
 * Unlike `/goals` and `/settings`, both controls here are plain `<a>`/`<button>`
 * elements in the reference, not shadcn components — so there is no base layer
 * contributing classes, and the string really is the whole story. `rounded-none`
 * is still needed on the `<button>`, for #135's reason.
 */
describe("NotFoundScreen route-body parity", () => {
  it("centres a max-w-md column on a full-height flex container", () => {
    // `flex min-h-screen items-center justify-center bg-background px-4` with an
    // inner `max-w-md text-center` (`__root.tsx:19`). Ours was a single
    // `flex-col … gap-6 … py-16` column with no inner wrapper, so nothing
    // constrained the text width.
    render(<NotFoundScreen />);
    const shell = screen.getByTestId("notfound-shell");
    expect(shell).toHaveClass("flex", "min-h-screen", "items-center", "px-4");
    expect(shell).not.toHaveClass("min-h-dvh", "flex-col", "gap-6", "py-16");
    expect(screen.getByTestId("notfound-column")).toHaveClass(
      "max-w-md",
      "text-center",
    );
  });

  it("paints the 404 numeral in the foreground colour", () => {
    render(<NotFoundScreen />);
    expect(screen.getByRole("heading", { name: "404" })).toHaveClass(
      "text-foreground",
    );
  });

  it("sets the caption at text-xs with the reference's top margin", () => {
    render(<NotFoundScreen />);
    const caption = screen.getByText("Page not found");
    expect(caption).toHaveClass("mt-4", "text-xs");
    expect(caption).not.toHaveClass("text-[11px]");
  });

  it("renders Go home as a SOLID button that hovers to outline", () => {
    // The row that matters most here. The reference's 404 `Go home` is filled
    // (`bg-foreground text-background`, hovering to `bg-transparent`); ours was
    // an outline link byte-identical to the error screen's `Go home`, which in
    // the reference is a genuinely different control (§6b).
    render(<NotFoundScreen />);
    const link = screen.getByRole("link", { name: "Go home" });
    expect(link).toHaveClass(
      "border-2",
      "border-foreground",
      "bg-foreground",
      "text-background",
      "px-4",
      "py-2",
      "hover:bg-transparent",
      "hover:text-foreground",
    );
    expect(link).not.toHaveClass("border-border", "px-6", "py-3");
  });
});
