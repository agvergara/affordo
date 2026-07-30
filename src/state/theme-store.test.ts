// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  defaultTheme,
  loadStoredTheme,
  loadTheme,
  saveTheme,
  type Theme,
} from "./theme-store";

beforeEach(() => window.localStorage.clear());

describe("theme persistence", () => {
  it("round-trips a saved theme through localStorage", () => {
    const theme: Theme = "dark";
    saveTheme(theme);
    expect(loadTheme()).toBe(theme);
  });

  it("falls back to the default when nothing is stored", () => {
    expect(loadTheme()).toBe(defaultTheme);
  });

  it("falls back to the default for unparseable JSON", () => {
    window.localStorage.setItem("affordo.theme", "{not json");
    expect(loadTheme()).toBe(defaultTheme);
  });

  it("falls back to the default for a foreign schema version", () => {
    window.localStorage.setItem(
      "affordo.theme",
      JSON.stringify({ schemaVersion: 99, theme: "dark" }),
    );
    expect(loadTheme()).toBe(defaultTheme);
  });

  it("falls back to the default for an unrecognized theme value", () => {
    window.localStorage.setItem(
      "affordo.theme",
      JSON.stringify({ schemaVersion: 1, theme: "midnight" }),
    );
    expect(loadTheme()).toBe(defaultTheme);
  });
});

describe("loadStoredTheme distinguishes 'no preference' from a stored one", () => {
  it("returns null when nothing is stored", () => {
    expect(loadStoredTheme()).toBeNull();
  });

  it("returns null for a record from a foreign schema version", () => {
    // Not merely defensive: `loadStoredTheme() !== null` is what stamps
    // `data-theme`, which suppresses the prefers-color-scheme block. Returning
    // a theme here instead of null would mark the root for every stale record
    // and silently force every OS-dark user to light on a schema bump.
    window.localStorage.setItem(
      "affordo.theme",
      JSON.stringify({ schemaVersion: 99, theme: "dark" }),
    );
    expect(loadStoredTheme()).toBeNull();
  });

  it("returns null when the stored theme is not a theme", () => {
    window.localStorage.setItem(
      "affordo.theme",
      JSON.stringify({ schemaVersion: 1, theme: "purple" }),
    );
    expect(loadStoredTheme()).toBeNull();
  });

  it("returns the theme the user actually chose", () => {
    saveTheme("light");
    expect(loadStoredTheme()).toBe("light");
  });
});
