// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { loadGoals, saveGoals, type Goal } from "./goals-store";

beforeEach(() => window.localStorage.clear());

describe("goals persistence", () => {
  it("round-trips saved goals through localStorage", () => {
    const goals: Goal[] = [
      {
        id: "a",
        name: "MacBook",
        price: 2499,
        note: "work laptop",
        createdAt: 1,
      },
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

  // Domain-range validation (issue #81): a price is the right *type* yet out of
  // domain when negative — a hostile or corrupt localStorage record that never
  // passed through the goal-entry input layer. The store drops such rows so a
  // negative price cannot drive verdict computation (see docs/adr/0019).
  it("drops a goal row with a negative price", () => {
    window.localStorage.setItem(
      "affordo.goals",
      JSON.stringify({
        schemaVersion: 1,
        goals: [
          { id: "a", name: "MacBook", price: 2499, note: "", createdAt: 1 },
          { id: "b", name: "Rebate", price: -500, note: "", createdAt: 2 },
        ],
      }),
    );
    expect(loadGoals()).toEqual([
      { id: "a", name: "MacBook", price: 2499, note: "", createdAt: 1 },
    ]);
  });

  it("keeps a free goal priced at exactly zero", () => {
    const goals: Goal[] = [
      { id: "a", name: "Freebie", price: 0, note: "", createdAt: 1 },
    ];
    saveGoals(goals);
    expect(loadGoals()).toEqual(goals);
  });

  // The Share (#155, ADR 0024). Added as an OPTIONAL field at the unchanged
  // schemaVersion 1, because this load path discards on a version mismatch
  // rather than migrating — a bump would delete every existing user's goals.
  describe("the Share", () => {
    it("round-trips a goal that carries one", () => {
      const goals: Goal[] = [
        {
          id: "a",
          name: "MacBook",
          price: 2499,
          note: "",
          createdAt: 1,
          share: 200,
        },
      ];
      saveGoals(goals);
      expect(loadGoals()).toEqual(goals);
    });

    it("loads a goal saved before the Share existed, as Unassigned", () => {
      // The whole reason the version did not move: this record is the shape
      // every stored goal had until #155, and it must survive untouched.
      window.localStorage.setItem(
        "affordo.goals",
        JSON.stringify({
          schemaVersion: 1,
          goals: [
            { id: "a", name: "MacBook", price: 2499, note: "", createdAt: 1 },
          ],
        }),
      );
      const [goal] = loadGoals();
      expect(goal).toEqual({
        id: "a",
        name: "MacBook",
        price: 2499,
        note: "",
        createdAt: 1,
      });
      expect(goal?.share).toBeUndefined();
    });

    it("keeps a Share of exactly zero — that is Unassigned, not corruption", () => {
      const goals: Goal[] = [
        {
          id: "a",
          name: "MacBook",
          price: 2499,
          note: "",
          createdAt: 1,
          share: 0,
        },
      ];
      saveGoals(goals);
      expect(loadGoals()).toEqual(goals);
    });

    // Range validation per ADR 0019: right type, wrong domain. Such a row never
    // passed through the input layer, so it is corrupt or hostile and is
    // dropped whole — exactly as a negative price is.
    it.each([
      ["negative", -50],
      ["infinite", Number.POSITIVE_INFINITY],
      ["not a number", Number.NaN],
    ])("drops a goal row whose Share is %s", (_label, share) => {
      window.localStorage.setItem(
        "affordo.goals",
        JSON.stringify({
          schemaVersion: 1,
          goals: [
            { id: "a", name: "Keep", price: 100, note: "", createdAt: 1 },
            {
              id: "b",
              name: "Drop",
              price: 100,
              note: "",
              createdAt: 2,
              share,
            },
          ],
        }),
      );
      expect(loadGoals().map((g) => g.id)).toEqual(["a"]);
    });

    it("drops a goal row whose Share is the wrong type entirely", () => {
      window.localStorage.setItem(
        "affordo.goals",
        JSON.stringify({
          schemaVersion: 1,
          goals: [
            { id: "a", name: "Keep", price: 100, note: "", createdAt: 1 },
            {
              id: "b",
              name: "Drop",
              price: 100,
              note: "",
              createdAt: 2,
              share: "200",
            },
          ],
        }),
      );
      expect(loadGoals().map((g) => g.id)).toEqual(["a"]);
    });

    it("still loads data written by a newer bundle, ignoring what it does not know", () => {
      // Forward compatibility is the other half of not bumping the version:
      // an older tab must not wipe a newer tab's goals.
      window.localStorage.setItem(
        "affordo.goals",
        JSON.stringify({
          schemaVersion: 1,
          goals: [
            {
              id: "a",
              name: "MacBook",
              price: 2499,
              note: "",
              createdAt: 1,
              share: 200,
              somethingFromTheFuture: true,
            },
          ],
        }),
      );
      expect(loadGoals().map((g) => g.id)).toEqual(["a"]);
    });
  });
});
