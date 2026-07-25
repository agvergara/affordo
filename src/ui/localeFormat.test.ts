import { describe, expect, it } from "vitest";
import { formatMoney, formatNumber, localeFor } from "./localeFormat";

describe("localeFor", () => {
  it("maps each currency to its reference locale", () => {
    expect(localeFor("EUR")).toBe("de-DE");
    expect(localeFor("GBP")).toBe("en-GB");
    expect(localeFor("USD")).toBe("en-US");
  });
});

describe("formatMoney", () => {
  it("renders EUR in de-DE style with a trailing symbol", () => {
    // de-DE: dot thousands, comma decimals, symbol suffix.
    expect(formatMoney(1234.56, "EUR")).toBe("1.234,56 €");
  });

  it("renders GBP in en-GB style", () => {
    expect(formatMoney(1234.56, "GBP")).toBe("£1,234.56");
  });

  it("renders USD in en-US style", () => {
    expect(formatMoney(1234.56, "USD")).toBe("$1,234.56");
  });

  it("caps at two fraction digits", () => {
    expect(formatMoney(1234.567, "USD")).toBe("$1,234.57");
  });

  it("returns an em dash for non-finite input", () => {
    expect(formatMoney(Infinity, "USD")).toBe("—");
    expect(formatMoney(-Infinity, "EUR")).toBe("—");
    expect(formatMoney(NaN, "GBP")).toBe("—");
  });
});

describe("formatNumber", () => {
  it("defaults to one fraction digit", () => {
    expect(formatNumber(12.34, "USD")).toBe("12.3");
  });

  it("honours a custom digit count", () => {
    expect(formatNumber(12.345, "USD", 2)).toBe("12.35");
    expect(formatNumber(12.6, "USD", 0)).toBe("13");
  });

  it("drops trailing zeros via minimumFractionDigits 0", () => {
    expect(formatNumber(12, "USD", 2)).toBe("12");
  });

  it("uses the currency's locale for grouping and decimals", () => {
    // de-DE swaps the grouping/decimal separators.
    expect(formatNumber(1234.5, "EUR", 1)).toBe("1.234,5");
  });

  it("returns an em dash for non-finite input", () => {
    expect(formatNumber(Infinity, "USD")).toBe("—");
    expect(formatNumber(NaN, "EUR")).toBe("—");
  });
});
