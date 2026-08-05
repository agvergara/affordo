// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import { GoalsDashboard } from "./GoalsDashboard";
import { AffordoProvider } from "../state/AffordoProvider";
import { ThemeProvider } from "../state/ThemeProvider";
import { defaultProfile, saveProfile } from "../state/profile-store";
import { saveGoals, type Goal } from "../state/goals-store";

beforeEach(() => window.localStorage.clear());

/** A minimal reference Goal, overridable per test. */
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
 * Render the dashboard inside a real provider hydrated to a given profile and
 * goal list. `act` flushes the provider's post-mount hydration effect so the
 * dashboard reads the persisted state rather than the empty defaults.
 */
function renderDashboard(
  profile?: Partial<typeof defaultProfile>,
  goals: Goal[] = [],
) {
  saveProfile({ ...defaultProfile, salary: 2000, ...profile });
  saveGoals(goals);
  act(() => {
    render(
      <ThemeProvider>
        <AffordoProvider>
          <GoalsDashboard />
        </AffordoProvider>
      </ThemeProvider>,
    );
  });
}

describe("GoalsDashboard heading", () => {
  it("renders the Goals title and the Affordo eyebrow", () => {
    renderDashboard();
    const title = screen.getByRole("heading", { name: /goals/i });
    expect(title).toBeInTheDocument();
    // The eyebrow sits above the big title, distinct from the footer's
    // `Affordo` label — which lives *inside* main, as the reference has it, so
    // scoping to main no longer separates them. Excluding the footer is what
    // isolates the eyebrow.
    //
    // The header wordmark needs no exclusion: it is a link inside a `<nav>`
    // outside `<main>`, so scoping to main already drops it. A `tagName !== "A"`
    // clause here would be dead.
    const main = screen.getByRole("main");
    const footer = screen.getByRole("contentinfo");
    const eyebrows = within(main)
      .getAllByText("Affordo")
      .filter((el) => !footer.contains(el));
    expect(eyebrows).toHaveLength(1);
  });
});

describe("GoalsDashboard snapshot", () => {
  it("shows Time value per hour derived from the profile", () => {
    // 2000/mo × 12 payments ÷ (52 × 40h) = 11.538…/hour → de-DE EUR formatting.
    renderDashboard({ salary: 2000, currency: "EUR" });
    const cell = screen.getByTestId("snapshot-time-value");
    expect(cell).toHaveTextContent("Time value");
    expect(cell).toHaveTextContent("11,54 €");
    expect(cell).toHaveTextContent("/ hour");
  });

  it("shows Monthly surplus = salary − expenses + contribution", () => {
    // 2000 − 500 + 150 = 1650 → de-DE EUR formatting.
    renderDashboard({
      salary: 2000,
      expenses: 500,
      monthlyContribution: 150,
      currency: "EUR",
    });
    const cell = screen.getByTestId("snapshot-surplus");
    expect(cell).toHaveTextContent("Monthly surplus");
    expect(cell).toHaveTextContent("1.650,00 €");
  });

  it("shows the significance threshold as a percentage", () => {
    renderDashboard({ threshold: 15 });
    const cell = screen.getByTestId("snapshot-threshold");
    expect(cell).toHaveTextContent("15%");
  });

  it("formats the snapshot figures in the profile currency", () => {
    // Same inputs, USD → en-US formatting.
    renderDashboard({
      salary: 2000,
      expenses: 500,
      monthlyContribution: 150,
      currency: "USD",
    });
    expect(screen.getByTestId("snapshot-time-value")).toHaveTextContent(
      "$11.54",
    );
    expect(screen.getByTestId("snapshot-surplus")).toHaveTextContent(
      "$1,650.00",
    );
  });
});

describe("GoalsDashboard saved-goals divider", () => {
  it("shows the live goal count in the divider", () => {
    renderDashboard(undefined, [makeGoal(), makeGoal(), makeGoal()]);
    expect(screen.getByTestId("saved-goals-divider")).toHaveTextContent(
      "Saved goals · 3",
    );
  });

  it("counts zero goals in the divider", () => {
    renderDashboard(undefined, []);
    expect(screen.getByTestId("saved-goals-divider")).toHaveTextContent(
      "Saved goals · 0",
    );
  });
});

/**
 * Route-body parity (#127, dossier §6b).
 *
 * These are class assertions, under the same narrow exception #94 opened: the
 * geometry *is* the requirement, jsdom applies no stylesheet, so the class is
 * the only observable. Every value here was read off
 * `agvergara/dream-purchase-planner`'s `src/routes/goals.tsx`, not inferred from
 * the dossier's component teardowns — which is the whole point of #127, since
 * those teardowns would have "corrected" `px-5 py-5` to the `px-6 py-6` every
 * recorded CTA uses.
 */
describe("GoalsDashboard route-body parity", () => {
  it("wraps the eyebrow, title and snapshot in one rule-topped section", () => {
    // The reference has a single `<section>` opened by a 4px foreground rule
    // (`goals.tsx:75`), not a bare `<header>` beside a separate grid. The rule
    // is the page's masthead, so losing it flattens the whole screen's opening.
    renderDashboard();
    const snapshot = screen.getByTestId("snapshot");
    expect(snapshot.tagName).toBe("SECTION");
    expect(snapshot).toHaveClass(
      "mb-10",
      "border-t-4",
      "border-foreground",
      "pt-6",
    );
    expect(within(snapshot).getByText("Affordo")).toBeInTheDocument();
    expect(
      within(snapshot).getByRole("heading", { name: "Goals" }),
    ).toBeInTheDocument();
  });

  it("spaces the snapshot grid at mt-6 below the title", () => {
    renderDashboard();
    expect(screen.getByTestId("snapshot-grid")).toHaveClass("mt-6");
  });

  it("reproduces the reference's two hairline elements around the label", () => {
    // `h-px flex-1 bg-border` either side (`goals.tsx:110/114`).
    //
    // Measured in Chromium, both render **0px wide** and the label stays
    // left-aligned — an empty `flex-1` with no basis contributes nothing to
    // max-content inside a shrink-to-fit flex child. That is true of the
    // reference too, so reproducing the markup is right and reproducing a
    // *visible* divider would be inventing one. This asserts the elements
    // exist with the reference's classes, and deliberately claims nothing
    // about a rule anyone can see (#134's duel).
    renderDashboard();
    expect(screen.getAllByTestId("divider-rule")).toHaveLength(2);
    for (const rule of screen.getAllByTestId("divider-rule")) {
      expect(rule).toHaveClass("h-px", "flex-1", "bg-border");
    }
  });

  it("sets the divider label at the reference weight and tracking", () => {
    // `font-medium` and `tracking-[0.2em]`, matching the `Affordo` eyebrow
    // above it — ours had `font-bold tracking-widest`, a heavier pairing that
    // the dossier's own §6b prose describes correctly.
    renderDashboard();
    const label = screen.getByTestId("saved-goals-divider");
    expect(label.tagName).toBe("SPAN");
    expect(label).toHaveClass("font-medium", "tracking-[0.2em]");
    expect(label).not.toHaveClass("font-bold");
  });

  it("puts the add button in its own right-aligned block below the divider", () => {
    // Two stacked blocks in the reference, not one `justify-between` row: the
    // divider (`mb-6`) then the button (`mb-8 flex justify-end`). Merging them
    // pulls the button up onto the divider line.
    renderDashboard();
    const button = screen.getByRole("button", { name: /add goal/i });
    const block = button.parentElement as HTMLElement;
    expect(block).toHaveClass("mb-8", "flex", "justify-end");
    expect(within(block).queryByTestId("saved-goals-divider")).toBeNull();
  });

  it("sizes the add button as the reference does, with its plus glyph", () => {
    renderDashboard();
    const button = screen.getByRole("button", { name: /add goal/i });
    expect(button).toHaveClass("gap-2", "px-5", "py-5", "text-[11px]");
    expect(button).not.toHaveClass("px-4");
    expect(button).not.toHaveClass("py-2");
    expect(button).not.toHaveClass("text-[10px]");
    // `h-9` and `border-0` are why the *pixels* match, not just the string.
    // The reference renders a shadcn `<Button>` whose size variant contributes
    // `h-9`, which survives tailwind-merge against `px-5 py-5` (height and
    // padding are separate conflict groups). Without it this button rendered
    // 58.5px against the reference's 40px. `border-0` cancels `theme.css`'s
    // legacy global `button` border, which the reference's base layer has no
    // equivalent of. Both measured in Chromium (#134's duel).
    expect(button).toHaveClass("h-9", "border-0");
    expect(within(button).getByTestId("add-goal-plus")).toBeInTheDocument();
  });

  it("draws the empty state at the reference's heavier border and scale", () => {
    renderDashboard(undefined, []);
    const empty = screen.getByTestId("goals-empty");
    expect(empty).toHaveClass("border-2", "p-12");
    expect(within(empty).getByText(/no decisions/i)).toHaveClass("text-3xl");
  });

  it("spaces the goals list at space-y-5", () => {
    renderDashboard(undefined, [makeGoal(), makeGoal()]);
    expect(screen.getByTestId("goals-list")).toHaveClass("space-y-5");
  });
});

describe("GoalsDashboard empty state", () => {
  it("shows the reference empty copy when there are no goals", () => {
    renderDashboard(undefined, []);
    const empty = screen.getByTestId("goals-empty");
    expect(empty).toHaveTextContent("No decisions to reckon with yet.");
    expect(empty).toHaveTextContent(
      "Add your first goal to see what it costs in hours of your life.",
    );
  });

  it("hides the empty state once a goal exists", () => {
    renderDashboard(undefined, [makeGoal()]);
    expect(screen.queryByTestId("goals-empty")).not.toBeInTheDocument();
  });
});

describe("GoalsDashboard list container", () => {
  it("renders one item per goal", () => {
    renderDashboard(undefined, [
      makeGoal({ name: "MacBook" }),
      makeGoal({ name: "Down payment" }),
    ]);
    const list = screen.getByTestId("goals-list");
    expect(within(list).getAllByTestId("goal-item")).toHaveLength(2);
    expect(list).toHaveTextContent("MacBook");
    expect(list).toHaveTextContent("Down payment");
  });

  it("renders no list container when there are no goals", () => {
    renderDashboard(undefined, []);
    expect(screen.queryByTestId("goals-list")).not.toBeInTheDocument();
  });

  it("lets an over-long goal name truncate instead of blowing out the row", () => {
    renderDashboard(undefined, [
      makeGoal({
        name: "A very long goal name that keeps going and going and going",
      }),
    ]);
    const name = screen.getByRole("heading", {
      name: "A very long goal name that keeps going and going and going",
    });
    // A grid/flex child needs min-w-0 for `truncate` (overflow:hidden) to clamp;
    // without it the intrinsic width refuses to shrink and the name overflows.
    // On the card the name is the truncating h2 and min-w-0 sits on the column
    // that holds it (docs/affordo-context.md §5).
    expect(name).toHaveClass("truncate");
    expect(name.parentElement).toHaveClass("min-w-0");
  });
});

describe("GoalsDashboard goal cards", () => {
  it("renders each saved goal as a full card", () => {
    // Local noon, so the date reads the same in every timezone.
    const createdAt = new Date(2024, 0, 15, 12).getTime();
    renderDashboard({ salary: 2000, currency: "EUR", savings: 5000 }, [
      makeGoal({ name: "MacBook", price: 1500, createdAt }),
    ]);
    const item = screen.getByTestId("goal-item");
    expect(item).toHaveTextContent("1/15/2024");
    expect(item).toHaveTextContent("MacBook");
    expect(item).toHaveTextContent("1.500,00 €");
    // 5000 savings already cover the 1500 price.
    expect(item).toHaveTextContent("Afford");
  });
});

describe("GoalsDashboard footer", () => {
  it("notes that the record is kept locally, on the left", () => {
    renderDashboard();
    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer).getByText("Record persistent in local-cache"),
    ).toBeInTheDocument();
  });

  it("labels the footer with the brand, on the right", () => {
    renderDashboard();
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByText("Affordo")).toBeInTheDocument();
  });

  it("puts the local-cache note before the brand label in reading order", () => {
    renderDashboard();
    const footer = screen.getByRole("contentinfo");
    const note = within(footer).getByText("Record persistent in local-cache");
    const brand = within(footer).getByText("Affordo");
    // DOCUMENT_POSITION_FOLLOWING (4): the brand comes after the note in the
    // document, which is half of "note left, brand right".
    expect(note.compareDocumentPosition(brand)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("pushes the two labels to opposite ends of the row", () => {
    renderDashboard();
    // The other half: source order only lands the note on the left because the
    // row is laid out `flex` + `justify-between`. Drop that and both labels
    // bunch together at the start — the AC's left/right split is gone while
    // every text assertion above still passes. jsdom applies no stylesheet, so
    // the classes are the only observable, the same narrow exception the
    // verdict badge's colour tests take (PR #94).
    expect(screen.getByRole("contentinfo")).toHaveClass(
      "flex",
      "justify-between",
    );
  });

  it("renders the footer once goals exist too", () => {
    renderDashboard(undefined, [makeGoal(), makeGoal()]);
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent("Record persistent in local-cache");
    expect(footer).toHaveTextContent("Affordo");
  });

  it("dims the footer with the reference's own opacity", () => {
    renderDashboard();
    // Read off the reference app (`src/routes/goals.tsx:146`), which closes
    // #104: the dossier had no teardown for this footer, and #102's duel
    // reasoned from that silence that `opacity-50` must be an invention. It is
    // not — the reference dims this footer, and the extraction was simply
    // incomplete. This assertion replaces one that pinned that wrong
    // conclusion.
    //
    // The dimming is on the footer, not on a `text-muted-foreground`, which is
    // why the children carry no colour of their own.
    //
    // jsdom loads no stylesheet, so the class is the only observable — the
    // narrow exception the verdict badge's colour tests take (PR #94).
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveClass("opacity-50");
    expect(footer).not.toHaveClass("text-muted-foreground");
  });

  it("separates the footer from the content above it, as the reference does", () => {
    renderDashboard();
    const footer = screen.getByRole("contentinfo");
    // `mt-16 border-t pt-6` — a hairline rule above the footer, which our
    // earlier version had no equivalent of at all.
    expect(footer).toHaveClass("mt-16", "border-t", "border-border", "pt-6");
    // Inside `<main>`, so that rule separates it from the content rather than
    // from the viewport edge.
    expect(screen.getByRole("main").contains(footer)).toBe(true);
  });
});

describe("GoalsDashboard Add goal button", () => {
  it("is present with no goals", () => {
    renderDashboard(undefined, []);
    expect(
      screen.getByRole("button", { name: "Add goal" }),
    ).toBeInTheDocument();
  });

  it("is present with goals", () => {
    renderDashboard(undefined, [makeGoal()]);
    expect(
      screen.getByRole("button", { name: "Add goal" }),
    ).toBeInTheDocument();
  });
});
