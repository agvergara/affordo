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
});
