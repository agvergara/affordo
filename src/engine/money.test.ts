import { describe, expect, it } from "vitest";
import { parseAmount, formatAmount } from "./money";

describe("money — European formatting", () => {
  it("parses a plain decimal-comma amount into integer cents", () => {
    expect(parseAmount("10,00")).toBe(1_000);
  });

  it("parses dot thousands separators with a decimal comma", () => {
    expect(parseAmount("1.234,56")).toBe(123_456);
  });

  it("sums parsed amounts without floating-point drift", () => {
    // 0.1 + 0.2 !== 0.3 as floats; as integer cents it is exact.
    expect(parseAmount("0,10") + parseAmount("0,20")).toBe(30);
  });

  it("formats integer cents back to European notation", () => {
    expect(formatAmount(123_456)).toBe("1.234,56");
  });
});
