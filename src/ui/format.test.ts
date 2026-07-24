import { describe, expect, it } from "vitest";
import { formatChallenge, formatTimeCost, formatVerdict } from "./format";

describe("formatTimeCost", () => {
  it("pluralizes multi-unit values", () => {
    expect(formatTimeCost(4, "work-days")).toBe("4 work days");
    expect(formatTimeCost(2, "work-months")).toBe("2 work months");
  });

  it("uses the singular for a value of one", () => {
    expect(formatTimeCost(1, "work-days")).toBe("1 work day");
    expect(formatTimeCost(1, "hours")).toBe("1 hour");
    expect(formatTimeCost(1, "work-weeks")).toBe("1 work week");
  });

  it("keeps a decimal hours figure", () => {
    expect(formatTimeCost(2.3, "hours")).toBe("2.3 hours");
  });
});

describe("formatChallenge", () => {
  it("references the Time Cost so the challenge is concrete", () => {
    expect(formatChallenge(12, "work-days")).toContain("12 work days");
  });

  it("invites a pause without demeaning the person or nudging toward buying (ADR 0010)", () => {
    const copy = formatChallenge(12, "work-days").toLowerCase();
    // Challenges the decision, points toward reflection.
    expect(copy).toMatch(/pause|worth|reconsider|think|sit with/);
    // No shame aimed at the person, no dark pattern toward spending.
    for (const banned of [
      "irresponsible",
      "stupid",
      "beyond your means",
      "can't afford",
      "cannot afford",
      "waste",
      "treat yourself",
      "you deserve",
      "go ahead",
      "buy it",
    ]) {
      expect(copy).not.toContain(banned);
    }
  });
});

describe("formatVerdict — Not Reachable", () => {
  it("names the monthly shortfall when expenses exceed income", () => {
    const copy = formatVerdict(
      { kind: "not-reachable", monthlyShortfall: 20000 },
      "EUR",
    );
    expect(copy).toContain("€200,00 short each month");
    expect(copy).toMatch(/trimming expenses/i);
  });

  it("names the break-even instead of a nonsensical €0,00 shortfall", () => {
    const copy = formatVerdict(
      { kind: "not-reachable", monthlyShortfall: 0 },
      "EUR",
    );
    // Income only just covers expenses: there is no gap to quote.
    expect(copy).not.toMatch(/0,00 short/);
    expect(copy).toMatch(/nothing spare|only just covers/i);
    expect(copy).toMatch(/trimming expenses/i);
  });
});
