// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useEffect } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "./ThemeProvider";
import { defaultTheme, saveTheme } from "./theme-store";

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

/**
 * Stub `matchMedia`, which jsdom does not implement. Returns a handle so a test
 * can flip the OS preference and fire the `change` event the provider listens
 * for — the only way to exercise a live OS switch here.
 */
function stubMatchMedia(initialDark: boolean) {
  let matches = initialDark;
  // A new MediaQueryList per call, each with its OWN listener set, as CSSOM
  // View specifies. Sharing one set across instances would let code that
  // subscribes to one and unsubscribes from another pass — which leaks the
  // listener in a real browser, and is the likeliest refactor to break this.
  const instances: Array<Set<(e: MediaQueryListEvent) => void>> = [];
  const make = () => {
    const listeners = new Set<(e: MediaQueryListEvent) => void>();
    instances.push(listeners);
    return {
      get matches() {
        return matches;
      },
      media: "(prefers-color-scheme: dark)",
      addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) =>
        void listeners.add(fn),
      removeEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) =>
        void listeners.delete(fn),
    };
  };
  window.matchMedia = make as unknown as typeof window.matchMedia;
  return {
    /** Flip the OS preference and notify every live listener, as an OS switch would. */
    switchTo(dark: boolean) {
      matches = dark;
      act(() => {
        for (const listeners of instances) {
          for (const fn of [...listeners]) fn({ matches } as MediaQueryListEvent);
        }
      });
    },
    /** Listeners still attached across every instance handed out. */
    get listenerCount() {
      return instances.reduce((n, l) => n + l.size, 0);
    },
  };
}

describe("ThemeProvider follows the OS until the user decides (#73)", () => {
  const realMatchMedia = window.matchMedia;
  afterEach(() => {
    window.matchMedia = realMatchMedia;
  });

  it("starts dark on an OS-dark machine with no stored preference", () => {
    stubMatchMedia(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("starts light on an OS-light machine with no stored preference", () => {
    stubMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("follows the OS switching to dark while the user has not chosen", () => {
    const os = stubMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("light");

    os.switchTo(true);
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("stops following the OS once the user chooses", async () => {
    const os = stubMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "go-light" }));

    // The user picked the theme the OS already showed — the weakest case, and
    // the one that must still count as a choice.
    os.switchTo(true);
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("unsubscribes once the user chooses, rather than listening forever", async () => {
    const os = stubMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(os.listenerCount).toBe(1);

    await userEvent.click(screen.getByRole("button", { name: "go-dark" }));
    expect(os.listenerCount).toBe(0);
  });

  it("prefers a stored choice over the OS on first paint", () => {
    saveTheme("light");
    stubMatchMedia(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    // A returning user's choice outranks their machine — the behaviour #98
    // protected, now enforced by the provider rather than by a CSS guard.
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("treats a stored choice that agrees with the OS as a choice", () => {
    // The seeded half of the `chosen` seam. Both other stored-choice tests use
    // a value that *disagrees* with the OS, so `chosen` derived from
    // "differs from system" would pass them — and would then discard this
    // user's saved preference the moment their OS flipped, while
    // `affordo.theme` still held the old value.
    saveTheme("dark");
    const os = stubMatchMedia(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");

    os.switchTo(false);
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });

  it("does not subscribe for a stored choice that agrees with the OS", () => {
    saveTheme("dark");
    const os = stubMatchMedia(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(os.listenerCount).toBe(0);
  });

  it("never subscribes when a stored choice already exists", () => {
    saveTheme("dark");
    const os = stubMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(os.listenerCount).toBe(0);
  });

  it("falls back to the default where matchMedia does not exist", () => {
    // jsdom ships without it, and a theme provider is not the place to make a
    // whole suite depend on a browser API being polyfilled.
    (window as { matchMedia?: unknown }).matchMedia = undefined;
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent(defaultTheme);
  });
});
