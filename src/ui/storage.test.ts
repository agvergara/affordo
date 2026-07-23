// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { loadProfile } from "./storage";

beforeEach(() => window.localStorage.clear());

describe("loadProfile", () => {
  it("backfills fields missing from an older stored profile", () => {
    // A profile saved before itemized expenses / payments-per-year existed.
    window.localStorage.setItem(
      "affordo.profile",
      JSON.stringify({
        schemaVersion: 1,
        profile: {
          income: "1.300,00",
          savings: "",
          monthlyExpenses: "",
          hoursPerWeek: 40,
          currency: "EUR",
        },
      }),
    );

    const loaded = loadProfile();
    expect(loaded).not.toBeNull();
    expect(loaded!.expenseRows).toEqual([]);
    expect(loaded!.paymentsPerYear).toBe(12);
    expect(loaded!.hoursPerDay).toBe(8);
    expect(loaded!.income).toBe("1.300,00");
  });

  it("backfills the Significance Threshold to 10% monthly for profiles saved before it existed", () => {
    window.localStorage.setItem(
      "affordo.profile",
      JSON.stringify({
        schemaVersion: 1,
        profile: {
          income: "1.300,00",
          savings: "",
          monthlyExpenses: "",
          hoursPerWeek: 40,
          currency: "EUR",
        },
      }),
    );

    const loaded = loadProfile();
    expect(loaded!.thresholdPercent).toBe(10);
    expect(loaded!.thresholdBasis).toBe("monthly");
  });
});
