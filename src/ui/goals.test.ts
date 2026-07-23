// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { loadGoals, saveGoals, type Goal } from "./goals";

beforeEach(() => window.localStorage.clear());

const macbook: Goal = {
  id: "goal-1",
  name: "MacBook",
  price: 240_000,
  verdict: { kind: "save-up", months: 6 },
};

describe("goals storage", () => {
  it("round-trips a saved list of Goals through localStorage", () => {
    saveGoals([macbook]);
    expect(loadGoals()).toEqual([macbook]);
  });

  it("returns no Goals when nothing is stored", () => {
    expect(loadGoals()).toEqual([]);
  });

  it("ignores Goals stored under a foreign schema version", () => {
    window.localStorage.setItem(
      "affordo.goals",
      JSON.stringify({ schemaVersion: 99, goals: [macbook] }),
    );
    expect(loadGoals()).toEqual([]);
  });

  it("drops malformed Goals rather than returning a shape that crashes rendering", () => {
    // A schema-1 record hand-corrupted: one entry is missing its verdict.
    window.localStorage.setItem(
      "affordo.goals",
      JSON.stringify({
        schemaVersion: 1,
        goals: [macbook, { id: "bad", name: "Broken", price: 100 }],
      }),
    );
    expect(loadGoals()).toEqual([macbook]);
  });
});
