import { describe, it, expect } from "vitest";
import { formatMoney } from "./format";

describe("formatMoney", () => {
  it("formats with the given currency and two decimals", () => {
    expect(formatMoney(1234.5, "USD")).toBe("$1,234.50");
  });

  it("can drop the cents for big-number summaries", () => {
    expect(formatMoney(1234.56, "USD", { cents: false })).toBe("$1,235");
  });

  it("accepts Prisma Decimal-like values", () => {
    expect(formatMoney({ toString: () => "10" }, "USD")).toBe("$10.00");
  });

  it("returns an empty string for garbage instead of showing NaN", () => {
    expect(formatMoney("abc", "USD")).toBe("");
  });

  it("falls back gracefully for an unknown currency code", () => {
    expect(formatMoney(5, "NOT-A-CODE")).toContain("5.00");
  });
});
