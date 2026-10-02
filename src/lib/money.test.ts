import { describe, expect, it } from "vitest";
import {
  addCents,
  centsToDollars,
  dollarsToCents,
  formatMoneyFromCents,
  mulCentsRate,
} from "./money";

describe("money", () => {
  it("converts dollars to cents without float drift", () => {
    expect(dollarsToCents(19.99)).toBe(1999);
    expect(dollarsToCents(0.1 + 0.2)).toBe(30);
  });

  it("adds and multiplies in cents", () => {
    expect(addCents(100, 250, 50)).toBe(400);
    expect(mulCentsRate(10_000, 0.02)).toBe(200);
    expect(mulCentsRate(10_000, 200, true)).toBe(200);
  });

  it("formats from cents", () => {
    expect(formatMoneyFromCents(12345, { minimumFractionDigits: 2 })).toBe(
      "$123.45"
    );
    expect(centsToDollars(199)).toBe(1.99);
  });
});
