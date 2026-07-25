// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { defaultProfile, loadProfile, saveProfile } from "./profile-store";

beforeEach(() => window.localStorage.clear());

describe("profile persistence", () => {
  it("round-trips a saved profile through localStorage", () => {
    const profile = {
      ...defaultProfile,
      currency: "GBP" as const,
      salary: 3200,
      hoursPerWeek: 37,
      savings: 5000,
      monthlyContribution: 250,
    };

    saveProfile(profile);
    expect(loadProfile()).toEqual(profile);
  });

  it("falls back to defaults when nothing is stored", () => {
    expect(loadProfile()).toEqual(defaultProfile);
  });

  it("falls back to defaults for unparseable JSON", () => {
    window.localStorage.setItem("affordo.profile", "{not json");
    expect(loadProfile()).toEqual(defaultProfile);
  });

  it("falls back to defaults for a foreign schema version", () => {
    window.localStorage.setItem(
      "affordo.profile",
      JSON.stringify({ schemaVersion: 99, profile: defaultProfile }),
    );
    expect(loadProfile()).toEqual(defaultProfile);
  });

  it("falls back to defaults for a foreign-shaped profile (missing/mistyped fields)", () => {
    // The legacy string-valued shape from src/ui/storage.ts must not be accepted.
    window.localStorage.setItem(
      "affordo.profile",
      JSON.stringify({
        schemaVersion: 1,
        profile: { income: "1.300,00", currency: "EUR", hoursPerWeek: 40 },
      }),
    );
    expect(loadProfile()).toEqual(defaultProfile);
  });

  it("returns a fresh default copy so callers cannot corrupt the shared constant", () => {
    // A settings draft may seed from the fallback and edit in place (dossier §8).
    // That mutation must not leak into the module-level `defaultProfile`.
    const loaded = loadProfile();
    expect(loaded).not.toBe(defaultProfile);
    loaded.salary = 99999;
    expect(defaultProfile.salary).toBe(0);
    expect(loadProfile().salary).toBe(0);
  });

  it("rejects a profile with an unknown currency", () => {
    window.localStorage.setItem(
      "affordo.profile",
      JSON.stringify({
        schemaVersion: 1,
        profile: { ...defaultProfile, currency: "JPY" },
      }),
    );
    expect(loadProfile()).toEqual(defaultProfile);
  });
});
