// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useEffect } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "./ThemeProvider";
import { saveTheme } from "./theme-store";

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  document.documentElement.classList.remove("dark");
  // #98 added a `data-theme` marker; without this it leaks between tests and
  // makes results order-dependent.
  delete document.documentElement.dataset.theme;
});

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

describe("ThemeProvider — explicit choice versus OS preference (#98)", () => {
  const root = () => document.documentElement;

  it("marks the root when the user has chosen, so CSS can yield to it", async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    // Untouched: no marker, so the prefers-color-scheme block still applies.
    expect(root().dataset.theme).toBeUndefined();

    await userEvent.click(screen.getByRole("button", { name: "go-dark" }));
    expect(root().dataset.theme).toBe("dark");

    await userEvent.click(screen.getByRole("button", { name: "go-light" }));
    // The point of #98: choosing *light* must be as explicit as choosing dark.
    // It is the case that looks like the default and is not.
    expect(root().dataset.theme).toBe("light");
    expect(root().classList.contains("dark")).toBe(false);
  });

  it("keeps the marker for a returning user who chose light", () => {
    saveTheme("light");
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    // Seeded from storage, not from the first toggle: a returning user's
    // choice must keep overriding their OS across reloads.
    expect(root().dataset.theme).toBe("light");
  });

  it("leaves the root unmarked when storage holds no usable preference", () => {
    window.localStorage.setItem("affordo.theme", "not json");
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    // A corrupt record is not a choice — the OS keeps its say.
    expect(root().dataset.theme).toBeUndefined();
  });
});
