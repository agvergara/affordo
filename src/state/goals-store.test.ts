// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { loadGoals, saveGoals, type Goal } from "./goals-store";

beforeEach(() => window.localStorage.clear());

describe("goals persistence", () => {
  it("round-trips saved goals through localStorage", () => {
    const goals: Goal[] = [
      { id: "a", name: "MacBook", price: 2499, note: "work laptop", createdAt: 1 },
      { id: "b", name: "Down payment", price: 30000, note: "", createdAt: 2 },
    ];

    saveGoals(goals);
    expect(loadGoals()).toEqual(goals);
  });

  it("returns [] when nothing is stored", () => {
    expect(loadGoals()).toEqual([]);
  });

  it("returns [] for unparseable JSON", () => {
    window.localStorage.setItem("affordo.goals", "{not json");
    expect(loadGoals()).toEqual([]);
  });

  it("returns [] for a foreign schema version", () => {
    window.localStorage.setItem(
      "affordo.goals",
      JSON.stringify({ schemaVersion: 99, goals: [] }),
    );
    expect(loadGoals()).toEqual([]);
  });

  it("drops malformed rows and keeps the valid ones", () => {
    window.localStorage.setItem(
      "affordo.goals",
      JSON.stringify({
        schemaVersion: 1,
        goals: [
          { id: "a", name: "MacBook", price: 2499, note: "", createdAt: 1 },
          // Legacy shape with a verdict but no note/createdAt — must be dropped.
          { id: "b", name: "Old", price: 100, verdict: { kind: "afford" } },
          { id: "c", name: "NaN price", price: "lots", note: "", createdAt: 3 },
        ],
      }),
    );
    expect(loadGoals()).toEqual([
      { id: "a", name: "MacBook", price: 2499, note: "", createdAt: 1 },
    ]);
  });
});
