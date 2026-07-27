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

  // Domain-range validation (issue #81): a stored value can be the right *type*
  // yet out of the field's valid domain — a hostile or corrupt localStorage
  // record. The store is the trust boundary against a value that never passed
  // through the onboarding input layer. The ranges are the dossier's on-load
  // `ProfileSchema` (§7, "validation on load, not on input"), NOT the stricter
  // input-layer `canContinue` / slider bounds (see docs/adr/0019).
  describe("domain-range validation", () => {
    function storeProfile(overrides: Record<string, unknown>): void {
      window.localStorage.setItem(
        "affordo.profile",
        JSON.stringify({
          schemaVersion: 1,
          profile: { ...defaultProfile, ...overrides },
        }),
      );
    }

    it("rejects a negative salary", () => {
      storeProfile({ salary: -3200 });
      expect(loadProfile()).toEqual(defaultProfile);
    });

    it("accepts a persisted salary of exactly 0 (the pre-onboarding state)", () => {
      // The on-load schema is nonnegative, not `> 0`. A `salary: 0` profile is
      // the legitimate pre-onboarding record and must survive a round-trip; the
      // `> 0` guard belongs to the input layer's `canContinue`, not the store.
      const zeroSalary = { ...defaultProfile, threshold: 25 };
      storeProfile(zeroSalary);
      expect(loadProfile()).toEqual(zeroSalary);
    });

    it("rejects a non-positive hoursPerWeek", () => {
      storeProfile({ hoursPerWeek: 0 });
      expect(loadProfile()).toEqual(defaultProfile);
    });

    it("rejects a non-positive hoursPerDay", () => {
      storeProfile({ hoursPerDay: -1 });
      expect(loadProfile()).toEqual(defaultProfile);
    });

    it("rejects a non-positive paymentsPerYear", () => {
      storeProfile({ paymentsPerYear: 0 });
      expect(loadProfile()).toEqual(defaultProfile);
    });

    it("rejects negative expenses, savings, or monthlyContribution", () => {
      storeProfile({ expenses: -100 });
      expect(loadProfile()).toEqual(defaultProfile);
      storeProfile({ savings: -1 });
      expect(loadProfile()).toEqual(defaultProfile);
      storeProfile({ monthlyContribution: -50 });
      expect(loadProfile()).toEqual(defaultProfile);
    });

    it("rejects a threshold outside the 0–100 percentage scale", () => {
      storeProfile({ threshold: -1 });
      expect(loadProfile()).toEqual(defaultProfile);
      storeProfile({ threshold: 101 });
      expect(loadProfile()).toEqual(defaultProfile);
    });

    it("accepts an in-domain profile whose fields sit at the range edges", () => {
      const edge = {
        ...defaultProfile,
        salary: 0,
        hoursPerWeek: 1,
        hoursPerDay: 1,
        paymentsPerYear: 1,
        expenses: 0,
        savings: 0,
        monthlyContribution: 0,
        threshold: 100,
      };
      storeProfile(edge);
      expect(loadProfile()).toEqual(edge);
    });
  });
});
