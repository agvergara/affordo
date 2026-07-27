/**
 * The stored theme preference (docs/affordo-context.md §3/§10). A single
 * light/dark choice persisted to localStorage, mirroring the profile-store
 * pattern: a versioned envelope, a defensive load that degrades to the default
 * on anything unreadable, and a best-effort save. This slice makes the latent
 * `.dark` tokens (theme.css, from #44) a live, persisted theme; the ADR in
 * docs/adr/ records dark mode moving into scope.
 *
 * No toggle UI and no system-preference logic live here — those are later
 * slices (#72/#73). This module knows only how to remember the choice.
 */
export type Theme = "light" | "dark";

/** The starting theme before the user has expressed any preference (§10). */
export const defaultTheme: Theme = "light";

const KEY = "affordo.theme";
const SCHEMA_VERSION = 1;

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Load the saved theme, or `defaultTheme` if absent, unreadable, or from a
 * foreign/older schema. Never throws — a broken store degrades to the default,
 * so a hostile or corrupt localStorage record can never surface an invalid
 * theme (ADR 0011 defensive load, ADR 0019 validation on load).
 */
export function loadTheme(): Theme {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultTheme;
    const parsed = JSON.parse(raw) as {
      schemaVersion?: number;
      theme?: unknown;
    };
    if (parsed.schemaVersion !== SCHEMA_VERSION || !isTheme(parsed.theme)) {
      return defaultTheme;
    }
    return parsed.theme;
  } catch {
    return defaultTheme;
  }
}

export function saveTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, theme }),
    );
  } catch {
    // Ignore write failures (private mode, quota) — persistence is best-effort.
  }
}
