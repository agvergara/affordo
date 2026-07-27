// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { defaultTheme, loadTheme, saveTheme, type Theme } from "./theme-store";

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
