// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompareScreen } from "./CompareScreen";
import { AffordoProvider } from "../state/AffordoProvider";
import { ThemeProvider } from "../state/ThemeProvider";
import { defaultProfile, saveProfile } from "../state/profile-store";
import { loadGoals, saveGoals, type Goal } from "../state/goals-store";

beforeEach(() => window.localStorage.clear());

function makeGoal(overrides?: Partial<Goal>): Goal {
  return {
    id: crypto.randomUUID(),
    name: "MacBook",
    price: 1500,
    note: "",
    createdAt: 0,
    ...overrides,
  };
}

/**
 * Render `/compare` inside a real provider hydrated to a profile and goals.
 * `act` flushes the provider's post-mount hydration so the screen reads
 * persisted state rather than the defaults.
 *
 * Default profile: salary 3000, expenses 500 → a Monthly Disposable of 2500.
 */
function renderCompare(
  profile?: Partial<typeof defaultProfile>,
  goals: Goal[] = [],
) {
  saveProfile({
    ...defaultProfile,
    salary: 3000,
    expenses: 500,
    ...profile,
  });
  saveGoals(goals);
  act(() => {
    render(
      <ThemeProvider>
        <AffordoProvider>
          <CompareScreen />
        </AffordoProvider>
      </ThemeProvider>,
    );
  });
}

/** The share input belonging to the row whose goal name is `name`. */
function shareInputFor(name: string): HTMLInputElement {
  const item = screen
    .getAllByTestId("compare-item")
    .find((el) => within(el).queryByText(name) !== null);
  if (!item) throw new Error(`no compare row for "${name}"`);
  return within(item).getByLabelText(/monthly share/i) as HTMLInputElement;
}

/** The months readout for the row whose goal name is `name`. */
function monthsFor(name: string): string {
  const item = screen
    .getAllByTestId("compare-item")
    .find((el) => within(el).queryByText(name) !== null);
  if (!item) throw new Error(`no compare row for "${name}"`);
  return within(item).getByTestId("compare-months").textContent ?? "";
}

describe("the empty states", () => {
  it("says what the screen is for when no goals are saved", () => {
    renderCompare();
    expect(screen.getByTestId("compare-empty")).toBeInTheDocument();
    expect(screen.getByText("Nothing to compare yet.")).toBeInTheDocument();
  });

  it("shows no list when no goals are saved", () => {
    renderCompare();
    expect(screen.queryByTestId("compare-list")).not.toBeInTheDocument();
  });

  it("says how to start when there are goals but nothing is assigned", () => {
    renderCompare(undefined, [makeGoal({ name: "MacBook" })]);
    expect(screen.getByTestId("compare-none-assigned")).toBeInTheDocument();
  });

  it("still lists the goals when nothing is assigned, so they can be", () => {
    renderCompare(undefined, [makeGoal({ name: "MacBook" })]);
    expect(screen.getAllByTestId("compare-item")).toHaveLength(1);
  });

  it("drops the how-to-start line once something is assigned", () => {
    renderCompare(undefined, [makeGoal({ name: "MacBook", share: 200 })]);
    expect(
      screen.queryByTestId("compare-none-assigned"),
    ).not.toBeInTheDocument();
  });
});

describe("the list", () => {
  it("shows one row per saved goal, whether assigned or not", () => {
    renderCompare(undefined, [
      makeGoal({ name: "MacBook", share: 200 }),
      makeGoal({ name: "Holiday" }),
    ]);
    expect(screen.getAllByTestId("compare-item")).toHaveLength(2);
  });

  it("names each goal and its price", () => {
    renderCompare(undefined, [makeGoal({ name: "MacBook", price: 1500 })]);
    const [item] = screen.getAllByTestId("compare-item");
    expect(within(item!).getByText("MacBook")).toBeInTheDocument();
  });

  it("reads an Unassigned goal as outside the plan, not as never", () => {
    // The wording matters: "never" would be false in the discouraging
    // direction, and ADR 0024 makes Unassigned a state rather than a duration.
    renderCompare(undefined, [makeGoal({ name: "Holiday" })]);
    expect(monthsFor("Holiday")).toBe("— not assigned");
  });

  it("shows the months a Shared goal takes at its Share", () => {
    renderCompare(undefined, [
      makeGoal({ name: "MacBook", price: 1200, share: 100 }),
    ]);
    expect(monthsFor("MacBook")).toContain("12");
  });

  it("says a goal already covered by savings is funded now", () => {
    renderCompare({ savings: 5000 }, [
      makeGoal({ name: "Headphones", price: 300, share: 100 }),
    ]);
    expect(monthsFor("Headphones")).toBe("Funded through savings");
  });
});

describe("assigning a Share", () => {
  it("persists what the user types", async () => {
    const user = userEvent.setup();
    const goal = makeGoal({ name: "MacBook", price: 1200 });
    renderCompare(undefined, [goal]);

    await user.type(shareInputFor("MacBook"), "100");

    expect(loadGoals()[0]?.share).toBe(100);
  });

  it("updates the months as soon as it is assigned", async () => {
    const user = userEvent.setup();
    renderCompare(undefined, [makeGoal({ name: "MacBook", price: 1200 })]);

    expect(monthsFor("MacBook")).toBe("— not assigned");
    await user.type(shareInputFor("MacBook"), "100");
    expect(monthsFor("MacBook")).toContain("12");
  });

  it("adds it to the assigned total", async () => {
    const user = userEvent.setup();
    renderCompare(undefined, [makeGoal({ name: "MacBook", price: 1200 })]);

    await user.type(shareInputFor("MacBook"), "250");

    const total = screen.getByTestId("compare-assigned");
    expect(total.textContent).toContain("250");
  });

  it("seeds the field from a Share the goal already carries", () => {
    renderCompare(undefined, [makeGoal({ name: "MacBook", share: 200 })]);
    expect(shareInputFor("MacBook").value).toBe("200");
  });

  it("leaves the field empty for an Unassigned goal", () => {
    renderCompare(undefined, [makeGoal({ name: "MacBook" })]);
    expect(shareInputFor("MacBook").value).toBe("");
  });

  it("lets the user clear the field back to nothing without fighting them", async () => {
    // A controlled field re-derived from the stored number would refuse to go
    // empty; the draft state is what makes this possible.
    const user = userEvent.setup();
    renderCompare(undefined, [makeGoal({ name: "MacBook", share: 200 })]);

    await user.clear(shareInputFor("MacBook"));

    expect(shareInputFor("MacBook").value).toBe("");
    expect(monthsFor("MacBook")).toBe("— not assigned");
  });
});

describe("clearing a Share", () => {
  it("offers Clear only on an assigned goal", () => {
    renderCompare(undefined, [
      makeGoal({ name: "MacBook", share: 200 }),
      makeGoal({ name: "Holiday" }),
    ]);
    const rows = screen.getAllByTestId("compare-item");
    const assigned = rows.find((r) => within(r).queryByText("MacBook"));
    const unassigned = rows.find((r) => within(r).queryByText("Holiday"));
    expect(
      within(assigned!).getByRole("button", { name: /clear/i }),
    ).toBeInTheDocument();
    expect(
      within(unassigned!).queryByRole("button", { name: /clear/i }),
    ).toBeNull();
  });

  it("returns the goal to Unassigned without deleting it", async () => {
    const user = userEvent.setup();
    renderCompare(undefined, [makeGoal({ name: "MacBook", share: 200 })]);

    await user.click(screen.getByRole("button", { name: /clear/i }));

    expect(screen.getAllByTestId("compare-item")).toHaveLength(1);
    expect(monthsFor("MacBook")).toBe("— not assigned");
  });

  // Found by the duel on #164. Clear unmounts itself, so activating it dropped
  // focus to <body> and a keyboard user had to tab in from the top of the
  // document to carry on.
  it("moves focus to the field it just emptied rather than to the body", async () => {
    const user = userEvent.setup();
    renderCompare(undefined, [makeGoal({ name: "MacBook", share: 200 })]);

    await user.click(screen.getByRole("button", { name: /clear/i }));

    expect(document.activeElement).toBe(shareInputFor("MacBook"));
  });

  it("removes the stored Share entirely rather than storing a zero", async () => {
    // A cleared goal must be byte-identical to one saved before the feature
    // existed, so an older bundle reads it the same way.
    const user = userEvent.setup();
    renderCompare(undefined, [makeGoal({ name: "MacBook", share: 200 })]);

    await user.click(screen.getByRole("button", { name: /clear/i }));

    expect(loadGoals()[0]).not.toHaveProperty("share");
  });
});

describe("the totals", () => {
  it("shows the Monthly Disposable it is dividing", () => {
    renderCompare({ salary: 3000, expenses: 500 });
    expect(screen.getByTestId("compare-disposable").textContent).toContain(
      "2.500",
    );
  });

  it("totals the Shares across goals", () => {
    renderCompare(undefined, [
      makeGoal({ name: "MacBook", share: 200 }),
      makeGoal({ name: "Holiday", share: 300 }),
    ]);
    expect(screen.getByTestId("compare-assigned").textContent).toContain("500");
  });

  it("counts nothing when every goal is Unassigned", () => {
    renderCompare(undefined, [makeGoal({ name: "MacBook" })]);
    expect(screen.getByTestId("compare-assigned").textContent).toContain("0");
  });

  // Found by the duel on #164: this counted every saved goal, so it read
  // "Sharing · 2" directly above "Nothing is assigned yet".
  it("counts goals that are in the plan, not goals that exist", () => {
    renderCompare(undefined, [
      makeGoal({ name: "MacBook", share: 200 }),
      makeGoal({ name: "Holiday" }),
      makeGoal({ name: "Bike" }),
    ]);
    expect(screen.getByTestId("compare-divider")).toHaveTextContent(
      "Sharing · 1",
    );
  });

  it("counts none while nothing is assigned, agreeing with the line below it", () => {
    renderCompare(undefined, [
      makeGoal({ name: "MacBook" }),
      makeGoal({ name: "Holiday" }),
    ]);
    expect(screen.getByTestId("compare-divider")).toHaveTextContent(
      "Sharing · 0",
    );
    expect(screen.getByTestId("compare-none-assigned")).toBeInTheDocument();
  });
});

describe("the Delay", () => {
  /** The Delay line for the row whose goal name is `name`, or null. */
  function delayFor(name: string): string | null {
    const item = screen
      .getAllByTestId("compare-item")
      .find((el) => within(el).queryByText(name) !== null);
    if (!item) throw new Error(`no compare row for "${name}"`);
    return within(item).queryByTestId("compare-delay")?.textContent ?? null;
  }

  it("says how much longer a Shared goal takes than it would alone", () => {
    // 1200 at 100/mo = 12 months; alone at the whole 2500 surplus = 0.48.
    renderCompare(undefined, [
      makeGoal({ name: "MacBook", price: 1200, share: 100 }),
    ]);
    expect(delayFor("MacBook")).toContain("vs. alone");
  });

  it("shows nothing for an Unassigned goal", () => {
    renderCompare(undefined, [makeGoal({ name: "Holiday" })]);
    expect(delayFor("Holiday")).toBeNull();
  });

  it("shows nothing for a goal commanding the whole surplus", () => {
    // Delay is exactly zero here, and "+0 months vs. alone" would tell a goal
    // that is not late that it is.
    renderCompare(undefined, [
      makeGoal({ name: "MacBook", price: 5000, share: 2500 }),
    ]);
    expect(delayFor("MacBook")).toBeNull();
  });

  it("shows nothing for a goal savings already cover", () => {
    renderCompare({ savings: 9000 }, [
      makeGoal({ name: "Headphones", price: 300, share: 100 }),
    ]);
    expect(delayFor("Headphones")).toBeNull();
  });

  it("shows nothing when the Delay would round to zero on screen", () => {
    // Found by probing rather than by review. A Share exactly equal to the
    // disposable gives a delay of exactly 0, but a Share a hair under it gives
    // ~6e-11 — not zero, and rendered "+0 months vs. alone", telling a goal it
    // is late by nothing. The guard is on the displayed value for that reason.
    renderCompare(undefined, [
      makeGoal({ name: "MacBook", price: 5000, share: 2499.9999999 }),
    ]);
    expect(delayFor("MacBook")).toBeNull();
  });

  it("still shows a Delay large enough to read", () => {
    // The other side of that threshold: suppressing on the rendered value must
    // not start swallowing real figures.
    renderCompare(undefined, [
      makeGoal({ name: "MacBook", price: 5000, share: 1000 }),
    ]);
    expect(delayFor("MacBook")).toContain("vs. alone");
  });

  it("words a negative Delay plainly rather than going quiet", () => {
    // Only reachable on an Overdrawn plan. Hiding it would leave the screen
    // silent in the one state that most needs explaining.
    renderCompare(undefined, [
      makeGoal({ name: "MacBook", price: 5000, share: 5000 }),
    ]);
    expect(delayFor("MacBook")).toContain("sooner than alone");
  });

  it("delays both goals when two of them split the surplus", () => {
    renderCompare(undefined, [
      makeGoal({ name: "MacBook", price: 5000, share: 1250 }),
      makeGoal({ name: "Holiday", price: 5000, share: 1250 }),
    ]);
    expect(delayFor("MacBook")).toContain("vs. alone");
    expect(delayFor("Holiday")).toContain("vs. alone");
  });
});

describe("Overdrawn", () => {
  it("says how much more than exists has been assigned", () => {
    // 1000 − 900 = 100 disposable, 500 assigned → 400 over.
    renderCompare({ salary: 1000, expenses: 900 }, [
      makeGoal({ name: "MacBook", price: 1200, share: 500 }),
    ]);
    expect(screen.getByTestId("compare-overdrawn").textContent).toContain(
      "400",
    );
  });

  it("still shows the dates the plan implies rather than withholding them", () => {
    // Computed and warned, never blocked (ADR 0024).
    renderCompare({ salary: 1000, expenses: 900 }, [
      makeGoal({ name: "MacBook", price: 1200, share: 500 }),
    ]);
    expect(monthsFor("MacBook")).toContain("months");
  });

  it("names the levers rather than the user, per ADR 0010", () => {
    renderCompare({ salary: 1000, expenses: 900 }, [
      makeGoal({ name: "MacBook", price: 1200, share: 500 }),
    ]);
    const warning = screen.getByTestId("compare-overdrawn").textContent ?? "";
    expect(warning).toContain("Lower a share");
  });

  it("stays away when the Shares fit", () => {
    renderCompare(undefined, [
      makeGoal({ name: "MacBook", price: 1200, share: 500 }),
    ]);
    expect(screen.queryByTestId("compare-overdrawn")).not.toBeInTheDocument();
  });

  it("stays away when nothing is assigned, however tight the profile", () => {
    renderCompare({ salary: 1000, expenses: 900 }, [
      makeGoal({ name: "MacBook", price: 1200 }),
    ]);
    expect(screen.queryByTestId("compare-overdrawn")).not.toBeInTheDocument();
  });
});

describe("no surplus", () => {
  const broke = { salary: 1000, expenses: 1500 };

  it("says there is nothing to share", () => {
    renderCompare(broke, [
      makeGoal({ name: "MacBook", price: 1200, share: 100 }),
    ]);
    expect(screen.getByTestId("compare-no-surplus")).toBeInTheDocument();
  });

  it("shows a goal the savings already cover as funded", () => {
    // Withholding this would hide something true the user has earned.
    renderCompare({ ...broke, savings: 3000 }, [
      makeGoal({ name: "Headphones", price: 800, share: 100 }),
    ]);
    expect(monthsFor("Headphones")).toBe("Funded through savings");
  });

  it("calls an assigned goal unreachable, not unassigned", () => {
    // Two different nulls. Telling a user who assigned a Share that they had
    // not is a different and worse statement than telling them it cannot be
    // funded.
    renderCompare(broke, [
      makeGoal({ name: "MacBook", price: 1200, share: 100 }),
    ]);
    expect(monthsFor("MacBook")).toBe("— unreachable");
  });

  it("still calls a goal with no Share unassigned", () => {
    renderCompare(broke, [makeGoal({ name: "Holiday", price: 900 })]);
    expect(monthsFor("Holiday")).toBe("— not assigned");
  });

  it("shows the no-surplus message instead of the Overdrawn one", () => {
    // Both are technically true with no surplus and something assigned, but
    // "you have no surplus" is the cause and "you assigned too much" is the
    // symptom. Two warnings would say the same thing twice.
    renderCompare(broke, [
      makeGoal({ name: "MacBook", price: 1200, share: 100 }),
    ]);
    expect(screen.queryByTestId("compare-overdrawn")).not.toBeInTheDocument();
  });

  it("stays away on a healthy profile", () => {
    renderCompare(undefined, [makeGoal({ name: "MacBook", share: 100 })]);
    expect(screen.queryByTestId("compare-no-surplus")).not.toBeInTheDocument();
  });
});

describe("where the funding came from", () => {
  it("names savings as the source rather than only the timing", () => {
    // "Funded now" said when and not where from, and where from is the part
    // that is not obvious from the rest of the row (#170).
    renderCompare({ savings: 5000 }, [
      makeGoal({ name: "Headphones", price: 300, share: 100 }),
    ]);
    expect(monthsFor("Headphones")).toBe("Funded through savings");
  });

  it("says it for a goal with no Share at all, when savings cover it", () => {
    // An Unassigned goal draws no cut of the pot, so the plan cannot fund it —
    // but the user's savings would cover it on their own, and that is worth
    // saying rather than withholding behind "not assigned".
    renderCompare({ savings: 5000 }, [
      makeGoal({ name: "Headphones", price: 300 }),
    ]);
    expect(monthsFor("Headphones")).toBe("Funded through savings");
  });

  it("still says not assigned when savings do not cover it", () => {
    renderCompare({ savings: 100 }, [
      makeGoal({ name: "MacBook", price: 3000 }),
    ]);
    expect(monthsFor("MacBook")).toBe("— not assigned");
  });

  it("keeps the strict test for a goal in the plan", () => {
    // Two Shared goals split 5000 evenly, so each opens with 2500. The 3000
    // goal is NOT covered by its own cut, and must not borrow the weaker
    // whole-pot claim that unassigned goals get.
    renderCompare({ savings: 5000 }, [
      makeGoal({ name: "MacBook", price: 3000, share: 100 }),
      makeGoal({ name: "Holiday", price: 3000, share: 100 }),
    ]);
    expect(monthsFor("MacBook")).not.toBe("Funded through savings");
  });

  it("keeps it even where the weaker claim would otherwise reach", () => {
    // The case that actually pins the guard, and the reason the test above is
    // not enough: it has months of 5, so it never enters the branch where the
    // weaker claim lives. Only a goal whose months are NULL gets there, and for
    // an assigned goal that means no surplus.
    //
    // Here savings of 5000 would cover this 3000 goal on its own, but its own
    // cut is 2500 and there is no monthly money. It is in the plan, so the plan
    // must answer: unreachable. Borrowing the whole-pot claim would let two
    // goals in one plan both say the same 5000 pays for them.
    renderCompare({ salary: 1000, expenses: 1500, savings: 5000 }, [
      makeGoal({ name: "MacBook", price: 3000, share: 100 }),
      makeGoal({ name: "Holiday", price: 3000, share: 100 }),
    ]);
    expect(monthsFor("MacBook")).toBe("— unreachable");
    expect(monthsFor("Holiday")).toBe("— unreachable");
  });
});
