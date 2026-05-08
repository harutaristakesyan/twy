import { describe, expect, it } from "vitest";
import { calculateProfit } from "./profit.js";

describe("calculateProfit", () => {
  it("computes the TWY-5 scenario: $100 fee + 5% of $2000 + $50 charges = $250", () => {
    const result = calculateProfit({
      serviceFee: 100,
      incomePercentage: 5,
      customerRate: 2000,
      charges: 50,
    });
    expect(result.serviceFee).toBe(100);
    expect(result.incomeAmount).toBe(100);
    expect(result.charges).toBe(50);
    expect(result.total).toBe(250);
  });

  it("treats null inputs as zero", () => {
    const result = calculateProfit({
      serviceFee: null,
      incomePercentage: null,
      customerRate: null,
      charges: null,
    });
    expect(result.total).toBe(0);
  });

  it("handles zero percentage", () => {
    const result = calculateProfit({
      serviceFee: 200,
      incomePercentage: 0,
      customerRate: 5000,
      charges: 0,
    });
    expect(result.incomeAmount).toBe(0);
    expect(result.total).toBe(200);
  });

  it("handles null customerRate with non-zero percentage (income = 0)", () => {
    const result = calculateProfit({
      serviceFee: 50,
      incomePercentage: 10,
      customerRate: null,
      charges: 25,
    });
    expect(result.incomeAmount).toBe(0);
    expect(result.total).toBe(75);
  });
});
