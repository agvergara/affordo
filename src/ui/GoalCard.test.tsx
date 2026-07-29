// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { GoalCard } from "./GoalCard";
import { AffordoProvider } from "../state/AffordoProvider";
import { defaultProfile, saveProfile } from "../state/profile-store";
import type { Goal } from "../state/goals-store";

beforeEach(() => window.localStorage.clear());

/** Local noon, so the rendered date is the same calendar day in every timezone. */
const JAN_15_2024 = new Date(2024, 0, 15, 12).getTime();

function makeGoal(overrides?: Partial<Goal>): Goal {
  return {
    id: "g1",
    name: "MacBook",
    price: 1500,
    note: "",
    createdAt: JAN_15_2024,
    ...overrides,
  };
}

/**
 * Render one card inside a real provider hydrated to a given profile. `act`
 * flushes the provider's post-mount hydration so the card reads the persisted
 * profile rather than the empty defaults.
 */
function renderCard(
  goal: Goal = makeGoal(),
  profile?: Partial<typeof defaultProfile>,
) {
  saveProfile({ ...defaultProfile, salary: 2000, ...profile });
  act(() => {
    render(
      <AffordoProvider>
        <GoalCard goal={goal} />
      </AffordoProvider>,
    );
  });
}

describe("GoalCard header", () => {
  it("stamps the goal with its creation date in US format", () => {
    renderCard(makeGoal({ createdAt: JAN_15_2024 }));
    expect(screen.getByText("1/15/2024")).toBeInTheDocument();
  });

  it("names the goal as the card's heading", () => {
    renderCard(makeGoal({ name: "Down payment" }));
    expect(
      screen.getByRole("heading", { name: "Down payment" }),
    ).toBeInTheDocument();
  });

  it("shows the note when the goal has one", () => {
    renderCard(makeGoal({ note: "16 inch, refurbished" }));
    expect(screen.getByText("16 inch, refurbished")).toBeInTheDocument();
    expect(screen.getByTestId("goal-note")).toBeInTheDocument();
  });

  it("shows no note line when the goal has none", () => {
    renderCard(makeGoal({ note: "" }));
    expect(screen.queryByTestId("goal-note")).not.toBeInTheDocument();
  });
});

describe("GoalCard verdict badge", () => {
  it("reads Afford when savings already cover the price", () => {
    renderCard(makeGoal({ price: 1500 }), { savings: 2000 });
    expect(screen.getByText("Afford")).toBeInTheDocument();
  });

  it("reads Stretch when the surplus reaches the price within a year", () => {
    // 1500 to find, 1000/mo surplus (2000 − 1000) → 1.5 months.
    renderCard(makeGoal({ price: 1500 }), { savings: 0, expenses: 1000 });
    expect(screen.getByText("Stretch")).toBeInTheDocument();
  });

  it("reads Cut to afford when only trimming expenses reaches it in a year", () => {
    // 30000 over 12 months needs 2500/mo; surplus is 1000, and the 1500
    // shortfall is inside half of the 4000 expenses.
    renderCard(makeGoal({ price: 30000 }), {
      savings: 0,
      expenses: 4000,
      salary: 5000,
    });
    expect(screen.getByText("Cut to afford")).toBeInTheDocument();
  });

  it("reads Cannot when even a half-expenses cut misses the year", () => {
    renderCard(makeGoal({ price: 500000 }), { savings: 0, expenses: 1000 });
    expect(screen.getByText("Cannot")).toBeInTheDocument();
  });
});

describe("GoalCard price", () => {
  it("shows the price in the profile currency", () => {
    renderCard(makeGoal({ price: 1500 }), { currency: "EUR" });
    expect(screen.getByText("1.500,00 €")).toBeInTheDocument();
  });

  it("follows the profile to another currency's locale", () => {
    renderCard(makeGoal({ price: 1500 }), { currency: "USD" });
    expect(screen.getByText("$1,500.00")).toBeInTheDocument();
  });
});

/**
 * A profile whose Time value is exactly $12/hour over an 8-hour day
 * (2080 × 12 ÷ (52 × 40)), so a price converts to whole hours and days.
 */
const TWELVE_AN_HOUR = { salary: 2080, currency: "USD" } as const;

describe("GoalCard threshold meter caption", () => {
  it("states the price as a percentage of monthly income", () => {
    // 500 of a 2000 salary is a quarter of a month's income.
    renderCard(makeGoal({ price: 500 }), { salary: 2000 });
    expect(screen.getByText("25% of monthly income")).toBeInTheDocument();
  });

  it("rounds the percentage to one decimal in the profile's locale", () => {
    // 250 of 2000 is 12.5%, written with a decimal comma under de-DE (EUR).
    renderCard(makeGoal({ price: 250 }), { salary: 2000, currency: "EUR" });
    expect(screen.getByText("12,5% of monthly income")).toBeInTheDocument();
  });

  it("shows an em dash rather than NaN when there is no income to measure against", () => {
    // salary 0 makes pctOfMonthlyIncome Infinity (dossier §8).
    renderCard(makeGoal({ price: 500 }), { salary: 0 });
    expect(screen.getByText("—% of monthly income")).toBeInTheDocument();
  });
});

describe("GoalCard threshold caption", () => {
  it("names the profile's significance threshold beside the percentage", () => {
    renderCard(makeGoal({ price: 500 }), { threshold: 15 });
    expect(screen.getByText("Significance threshold: 15%")).toBeInTheDocument();
  });

  // The caption's colour IS the behaviour — significance "visually flagged"
  // (#61, user story 39). jsdom exposes a colour only through the utility class
  // that sets it, so this follows the one exception VerdictBadge established
  // rather than inventing a second kind.
  //
  // NOTE: the accent lands on the THRESHOLD caption, not the percent caption.
  // The dossier's literal extraction (§5) is
  // `className={v.aboveThreshold ? "text-accent" : "text-muted-foreground"}` on
  // the right-hand span, while the percent span is permanently muted. #61's AC
  // and PRD story 39 read the other way round; the dossier wins on exact values.
  it("accents the threshold caption when the purchase is above threshold", () => {
    // 300 of a 2000 salary is 15%, past the 10% threshold.
    renderCard(makeGoal({ price: 300 }), { salary: 2000, threshold: 10 });
    expect(screen.getByText("Significance threshold: 10%")).toHaveClass(
      "text-accent",
    );
  });

  it("leaves the threshold caption muted at exactly the threshold", () => {
    // 200 of 2000 is exactly 10% — `aboveThreshold` is strictly greater-than.
    renderCard(makeGoal({ price: 200 }), { salary: 2000, threshold: 10 });
    expect(screen.getByText("Significance threshold: 10%")).toHaveClass(
      "text-muted-foreground",
    );
  });
});

describe("GoalCard threshold meter fill", () => {
  it("fills half the track at exactly the threshold", () => {
    // The bar is scaled to be full at twice the threshold (dossier §8), so the
    // threshold itself lands on the midpoint.
    renderCard(makeGoal({ price: 200 }), { salary: 2000, threshold: 10 });
    expect(screen.getByTestId("threshold-fill")).toHaveStyle({ width: "50%" });
  });

  it("fills the whole track at exactly twice the threshold", () => {
    // 400 of a 2000 salary is 20% — double the 10% threshold.
    renderCard(makeGoal({ price: 400 }), { salary: 2000, threshold: 10 });
    expect(screen.getByTestId("threshold-fill")).toHaveStyle({ width: "100%" });
  });

  it("caps the fill at a full track beyond twice the threshold", () => {
    // 1000 of 2000 is 50% — 2.5× the scale, which would overflow uncapped.
    renderCard(makeGoal({ price: 1000 }), { salary: 2000, threshold: 10 });
    expect(screen.getByTestId("threshold-fill")).toHaveStyle({ width: "100%" });
  });

  it("tracks a different threshold's scale", () => {
    // With a 25% threshold the track is full at 50%; 500 of 2000 is 25%, the
    // midpoint — proof the fill follows the threshold rather than a fixed scale.
    renderCard(makeGoal({ price: 500 }), { salary: 2000, threshold: 25 });
    expect(screen.getByTestId("threshold-fill")).toHaveStyle({ width: "50%" });
  });

  // Motion is the acceptance criterion here (#61, user story 69) and jsdom
  // exposes it only through the utility class, so this reuses the same narrow
  // exception as the colour assertions above. The utility itself — 0.7s,
  // scaleX 0→1, origin left — is proven in src/styles/theme.test.ts (#45).
  it("animates the fill in with the reference scale-in-x motion", () => {
    renderCard(makeGoal({ price: 200 }), { salary: 2000, threshold: 10 });
    expect(screen.getByTestId("threshold-fill")).toHaveClass(
      "animate-scale-in-x",
    );
  });
});

/**
 * The midpoint marker is hard-coded to `left: 50%` in the reference — it does
 * NOT move with the threshold. The dossier flags this as one of the "mistakes
 * that are requirements" (§13 open question 5, PRD §Formatting quirks), so it is
 * reproduced deliberately and pinned here against a well-meaning future fix.
 */
describe("GoalCard threshold meter midpoint marker", () => {
  it("sits at the midpoint of the track", () => {
    renderCard(makeGoal({ price: 200 }), { salary: 2000, threshold: 10 });
    expect(screen.getByTestId("threshold-marker")).toHaveStyle({ left: "50%" });
  });

  it("stays at the midpoint under a different threshold", () => {
    // A 40% threshold puts this 10% purchase at 12.5% of the track, yet the
    // marker does not follow the threshold — it is fixed, by design.
    renderCard(makeGoal({ price: 200 }), { salary: 2000, threshold: 40 });
    expect(screen.getByTestId("threshold-fill")).toHaveStyle({ width: "12.5%" });
    expect(screen.getByTestId("threshold-marker")).toHaveStyle({ left: "50%" });
  });

  it("hides the marker from assistive technology", () => {
    renderCard(makeGoal({ price: 200 }), { salary: 2000, threshold: 10 });
    expect(screen.getByTestId("threshold-marker")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});

describe("GoalCard work figure", () => {
  it("counts the price in days of work once it costs a full work day", () => {
    // $480 ÷ $12/hour = 40 hours = 5 eight-hour days.
    renderCard(makeGoal({ price: 480 }), TWELVE_AN_HOUR);
    expect(screen.getByText("5 days of work")).toBeInTheDocument();
  });

  it("counts the price in hours of work when it costs less than a day", () => {
    // $60 ÷ $12/hour = 5 hours — 0.625 of a work day, so hours it is.
    renderCard(makeGoal({ price: 60 }), TWELVE_AN_HOUR);
    expect(screen.getByText("5 hours of work")).toBeInTheDocument();
  });

  it("switches to days at exactly one work day", () => {
    // $96 ÷ $12/hour = 8 hours = 1 day exactly, the >= 1 boundary.
    renderCard(makeGoal({ price: 96 }), TWELVE_AN_HOUR);
    expect(screen.getByText("1 days of work")).toBeInTheDocument();
  });
});

describe("GoalCard stat block", () => {
  it("labels the two cells Time to save and Monthly surplus", () => {
    renderCard();
    expect(screen.getByText("Time to save")).toBeInTheDocument();
    expect(screen.getByText("Monthly surplus")).toBeInTheDocument();
  });

  it("shows the monthly surplus as money in the profile's locale", () => {
    // 3.000 salary less 1.200 expenses plus a 200 contribution = 2.000 surplus.
    renderCard(makeGoal(), {
      currency: "EUR",
      salary: 3000,
      expenses: 1200,
      monthlyContribution: 200,
    });
    expect(screen.getByText("2.000,00 €")).toBeInTheDocument();
  });

  it("shows a surplus eaten by expenses as a negative amount", () => {
    // Expenses past the salary leave a deficit; the cell states it rather than
    // clamping to zero, so the number behind the verdict stays legible.
    renderCard(makeGoal(), { currency: "EUR", salary: 1000, expenses: 1800 });
    expect(screen.getByText("-800,00 €")).toBeInTheDocument();
  });
});

/**
 * The value a user reads under a stat cell's label. Found through the visible
 * label rather than a test id, so the assertion also proves the value is paired
 * with the right caption — which is the part of the stat block that can silently
 * go wrong.
 */
function statValue(label: string): string {
  const cell = screen.getByText(label).parentElement;
  return (cell?.textContent ?? "").replace(label, "").trim();
}

/**
 * `Time to save` reads off the verdict kind (dossier §5): an em dash when the
 * goal is already afforded, the saved-up months for a stretch, the cut horizon
 * with a trailing `*` for a cut, and `∞` when no plan reaches it.
 */
describe("GoalCard time to save", () => {
  it("shows an em dash when savings already cover the price", () => {
    renderCard(makeGoal({ price: 1500 }), { savings: 2000 });
    expect(statValue("Time to save")).toBe("—");
  });

  it("counts the months the surplus needs when the goal is a stretch", () => {
    // 1.500 to find at 1.000/month of surplus (2.000 − 1.000) → 1,5 months,
    // written with a decimal comma under the profile's de-DE locale.
    renderCard(makeGoal({ price: 1500 }), {
      currency: "EUR",
      salary: 2000,
      expenses: 1000,
      savings: 0,
    });
    expect(statValue("Time to save")).toBe("1,5 months");
  });

  /**
   * The trailing `*` marks a horizon that only exists if the expenses are cut —
   * and nothing on the card explains it. The reference ships it that way, so it
   * is reproduced verbatim rather than footnoted or dropped (dossier §13, PRD
   * §Formatting quirks). This test pins it against a well-meaning tidy-up.
   */
  it("marks a cut-derived horizon with the reference's unexplained asterisk", () => {
    // 30.000 over 12 months needs 2.500/month; the surplus is 1.000 and the
    // 1.500 shortfall fits inside half the 4.000 expenses → cut to afford.
    renderCard(makeGoal({ price: 30000 }), {
      salary: 5000,
      expenses: 4000,
      savings: 0,
    });
    expect(statValue("Time to save")).toBe("12 months *");
  });

  it("shows an infinity glyph when no savings plan reaches the goal", () => {
    // Half the 1.000 expenses still leaves 500.000 out of reach → cannot.
    renderCard(makeGoal({ price: 500000 }), {
      salary: 2000,
      expenses: 1000,
      savings: 0,
    });
    expect(statValue("Time to save")).toBe("∞");
  });
});

/**
 * One explainer paragraph per verdict, in the reference's copy (dossier §5/§6).
 * `stretch` deliberately has none — the months in the stat block are the whole
 * story for a goal the surplus already reaches.
 */
describe("GoalCard verdict explainer", () => {
  it("tells an afford verdict the savings are already there", () => {
    renderCard(makeGoal({ price: 1500 }), { savings: 2000 });
    expect(
      screen.getByText("You already have savings for this."),
    ).toBeInTheDocument();
  });

  it("tells a cannot verdict the goal is beyond a savings plan", () => {
    renderCard(makeGoal({ price: 500000 }), {
      salary: 2000,
      expenses: 1000,
      savings: 0,
    });
    expect(
      screen.getByText("Beyond a reasonable savings plan."),
    ).toBeInTheDocument();
  });
});
