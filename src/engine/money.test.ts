import { describe, expect, it } from "vitest";
import { parseAmount, formatAmount } from "./money";

describe("money — European formatting", () => {
  it("parses a plain decimal-comma amount into integer cents", () => {
    expect(parseAmount("10,00")).toEqual({ ok: true, cents: 1_000 });
  });

  it("parses dot thousands separators with a decimal comma", () => {
    expect(parseAmount("1.234,56")).toEqual({ ok: true, cents: 123_456 });
  });

  it("distinguishes a valid zero amount from empty input", () => {
    expect(parseAmount("0,00")).toEqual({ ok: true, cents: 0 });
  });

  it("reports empty and whitespace-only input as empty, not zero", () => {
    expect(parseAmount("")).toEqual({ ok: false, reason: "empty" });
    expect(parseAmount("   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("reports unparseable input as invalid instead of NaN", () => {
    expect(parseAmount("abc")).toEqual({ ok: false, reason: "invalid" });
    expect(parseAmount("1,2,3")).toEqual({ ok: false, reason: "invalid" });
  });

  it("sums parsed amounts without floating-point drift", () => {
    // 0.1 + 0.2 !== 0.3 as floats; as integer cents it is exact.
    const a = parseAmount("0,10");
    const b = parseAmount("0,20");
    expect(a.ok && b.ok && a.cents + b.cents).toBe(30);
  });

  it("formats integer cents back to European notation", () => {
    expect(formatAmount(123_456)).toBe("1.234,56");
  });
});
