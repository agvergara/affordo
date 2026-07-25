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
});
