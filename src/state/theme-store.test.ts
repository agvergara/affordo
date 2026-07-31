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
    // Not merely defensive: `loadStoredTheme() !== null` is what seeds
    // `chosen`, which decides whether the OS gets a say at all (#73). So this
    // return is the guard on the migration trap — bump `SCHEMA_VERSION` without
    // mapping v1 records forward and every existing chooser silently becomes a
    // system-follower, their saved theme discarded and their machine deciding
    // for them on the next OS switch. Returning a theme here instead of null
    // would trade that for the mirror failure: every stale record treated as a
    // deliberate choice, freezing users out of the OS preference entirely.
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

  it.each(["light", "dark"] as const)("returns the %s the user chose", (t) => {
    // Both values, because `light` alone is indistinguishable from
    // `defaultTheme`: a `return defaultTheme` mutant would pass it. Other tests
    // do kill that mutant, but an assertion that cannot tell the value it
    // asserts from the fallback is not pulling its weight.
    saveTheme(t);
    expect(loadStoredTheme()).toBe(t);
  });
});
