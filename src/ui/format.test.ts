import { describe, expect, it } from "vitest";
import { formatTimeCost } from "./format";

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
