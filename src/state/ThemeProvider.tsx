import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { loadTheme, saveTheme, type Theme } from "./theme-store";

/**
 * The theme state layer (docs/affordo-context.md §3/§10). Holds the current
 * theme, keeps the `dark` class on the document root in sync with it, and
 * persists the preference through `theme-store`. It is initialized from the
 * stored value, so a reload restores the last choice.
 *
 * Unlike `AffordoProvider`, whose hydration is deferred to after mount to keep
 * first paint deterministic, the theme is read synchronously (`useState(loadTheme)`)
 * and applied to the root in a `useLayoutEffect`, which React flushes
 * synchronously BEFORE the browser paints. Applying it in a plain `useEffect`
 * would run after paint and flash the light theme on a dark reload; a layout
 * effect lands the `.dark` class in the same frame as first paint, so no flash
 * occurs. (`index.html` ships no `.dark` class, so the pre-React initial markup
 * is light — the layout effect is what closes that gap before the pixel hits the
 * screen.) This slice carries no toggle UI and no system-preference logic; those
 * are #72/#73.
 */
export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Reflect the theme onto the document root: `.dark` present iff dark. */
function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(loadTheme);

  // Keep the root class in sync with the current theme, in a LAYOUT effect so it
  // lands before the browser paints — a plain effect would run post-paint and
  // flash light on a dark reload. Running on the initial theme applies the stored
  // preference; running on every change repaints via the token swap. StrictMode's
  // double-invoke is harmless — the class is set to a definite state, not toggled
  // relative to a prior one.
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
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
