import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { defaultTheme, loadStoredTheme, saveTheme, type Theme } from "./theme-store";

/**
 * The theme state layer (docs/affordo-context.md §3/§10). Holds the current
 * theme, keeps the `dark` class on the document root in sync with it, and
 * persists the preference through `theme-store`. It is initialized from the
 * stored value, so a reload restores the last choice.
 *
 * Unlike `AffordoProvider`, whose hydration is deferred to after mount to keep
 * first paint deterministic, the theme is read synchronously (`useState(loadStoredTheme() ?? systemTheme())`)
 * and applied to the root in a `useLayoutEffect`, which React flushes
 * synchronously BEFORE the browser paints. Applying it in a plain `useEffect`
 * would run after paint and flash the light theme on a dark reload; a layout
 * effect lands the `.dark` class in the same frame as first paint, so no flash
 * occurs. (`index.html` ships no `.dark` class, so the pre-React initial markup
 * is light — the layout effect is what closes that gap before the pixel hits the
 * screen.) The toggle UI is #72; the system-preference logic below is #73.
 */
export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** The media query the OS preference is read from. */
const OS_DARK = "(prefers-color-scheme: dark)";

/**
 * The OS's current preference, or `light` where it cannot be asked.
 *
 * `matchMedia` is guarded because jsdom does not implement it: an unguarded
 * read throws during any test that mounts a provider, and a theme provider is
 * not the place to make a whole suite depend on a browser API being polyfilled.
 */
function systemTheme(): Theme {
  if (typeof window.matchMedia !== "function") return defaultTheme;
  return window.matchMedia(OS_DARK).matches ? "dark" : "light";
}

/**
 * Reflect the theme onto the document root: `.dark` present iff dark.
 *
 * One mechanism, not two. #98 briefly added a `data-theme` marker so the legacy
 * `@media (prefers-color-scheme: dark)` block could tell an explicit choice
 * from an untouched default — but #73 deletes that block and resolves the OS
 * preference here instead, so nothing in CSS reads the marker any more and it
 * has gone with it. Auto-dark and chosen-dark now apply the *same* class, which
 * is why they cannot drift apart (#121).
 */
function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // A stored choice wins; otherwise the OS decides. `loadTheme` cannot be used
  // here because it collapses "no preference" into `defaultTheme`, which is the
  // distinction this whole slice turns on.
  const [theme, setThemeState] = useState<Theme>(
    () => loadStoredTheme() ?? systemTheme(),
  );
  // Whether the theme came from the user rather than from the OS. Seeded from
  // storage so a returning user's choice keeps overriding their OS, and used to
  // decide whether live OS changes are followed.
  const [chosen, setChosen] = useState(() => loadStoredTheme() !== null);

  // Keep the root class in sync with the current theme, in a LAYOUT effect so it
  // lands before the browser paints — a plain effect would run post-paint and
  // flash light on a dark reload. Running on the initial theme applies the stored
  // preference; running on every change repaints via the token swap. StrictMode's
  // double-invoke is harmless — the class is set to a definite state, not toggled
  // relative to a prior one.
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Follow the OS live, but only while the user has expressed no preference —
  // once they choose, their choice outranks the machine until they change it.
  useEffect(() => {
    if (chosen || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(OS_DARK);
    const onChange = (event: MediaQueryListEvent) =>
      setThemeState(event.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [chosen]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    setChosen(true);
    saveTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Read the theme state. Throws if used outside a `ThemeProvider`. */
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return value;
}
