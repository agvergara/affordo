// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useEffect } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "./ThemeProvider";
import { saveTheme } from "./theme-store";

beforeEach(() => window.localStorage.clear());
afterEach(() => document.documentElement.classList.remove("dark"));

function Probe() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme("dark")}>go-dark</button>
      <button onClick={() => setTheme("light")}>go-light</button>
    </div>
  );
}

describe("ThemeProvider applies and persists the theme", () => {
  it("throws when useTheme is called outside a provider", () => {
    function Orphan() {
      useTheme();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(/ThemeProvider/);
  });

  it("initializes from the stored preference and applies .dark on the root", () => {
    saveTheme("dark");
    act(() => {
      render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );
    });
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("applies .dark in the layout phase, before a child's passive effect (no flash)", () => {
    // A plain useEffect applies the class post-paint, flashing light on a dark
    // reload. Applying it in useLayoutEffect lands it in the commit phase — so by
    // the time a CHILD's passive (useEffect) runs, .dark is already on the root.
    // A child effect observing a missing class here would prove the class landed
    // too late (a plain effect racing another plain effect); seeing it present
    // proves the layout-effect ordering that avoids the flash.
    saveTheme("dark");
    let classAtChildEffect: boolean | undefined;
    function Observer() {
      useEffect(() => {
        classAtChildEffect = document.documentElement.classList.contains("dark");
      }, []);
      return null;
    }
    act(() => {
      render(
        <ThemeProvider>
          <Observer />
        </ThemeProvider>,
      );
    });
    expect(classAtChildEffect).toBe(true);
  });

  it("leaves .dark off when the stored preference is light", () => {
    saveTheme("light");
    act(() => {
      render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );
    });
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("adds .dark and persists when the theme is set to dark", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    await user.click(screen.getByText("go-dark"));

    expect(document.documentElement).toHaveClass("dark");
    expect(
      JSON.parse(window.localStorage.getItem("affordo.theme")!).theme,
    ).toBe("dark");
  });

  it("removes .dark and persists when the theme is set back to light", async () => {
    const user = userEvent.setup();
    saveTheme("dark");
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(document.documentElement).toHaveClass("dark");

    await user.click(screen.getByText("go-light"));

    expect(document.documentElement).not.toHaveClass("dark");
    expect(
      JSON.parse(window.localStorage.getItem("affordo.theme")!).theme,
    ).toBe("light");
  });

  it("round-trips the preference across a remount (reload)", async () => {
    const user = userEvent.setup();
    const first = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await user.click(screen.getByText("go-dark"));
    first.unmount();
    document.documentElement.classList.remove("dark");

    // A fresh provider (a reload) reads the persisted choice and re-applies it.
    act(() => {
      render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );
    });
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
  });
});
