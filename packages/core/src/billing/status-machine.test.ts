import { describe, expect, it } from "vitest";
import { assertValidTransition, isValidTransition } from "./status-machine.js";

describe("isValidTransition", () => {
  it.each([
    ["Pending", "Approved"],
    ["Pending", "Hold"],
    ["Pending", "Denied"],
    ["Approved", "ApprovedPaid"],
    ["Approved", "Hold"],
    ["ApprovedPaid", "Hold"],
    ["Hold", "Pending"],
    ["Hold", "Approved"],
    ["Denied", "Pending"],
  ] as const)("allows %s → %s", (from, to) => {
    expect(isValidTransition(from, to)).toBe(true);
  });

  it.each([
    ["Pending", "ApprovedPaid"],
    ["Approved", "Pending"],
    ["Approved", "Denied"],
    ["ApprovedPaid", "Approved"],
    ["ApprovedPaid", "Pending"],
    ["Denied", "Approved"],
    ["Denied", "Hold"],
  ] as const)("rejects %s → %s", (from, to) => {
    expect(isValidTransition(from, to)).toBe(false);
  });
});

describe("assertValidTransition", () => {
  it("does not throw for valid transitions", () => {
    expect(() => assertValidTransition("Pending", "Approved")).not.toThrow();
    expect(() => assertValidTransition("Approved", "ApprovedPaid")).not.toThrow();
  });

  it("throws 400 for invalid transitions", () => {
    expect(() => assertValidTransition("Pending", "ApprovedPaid")).toThrow(
      'Cannot transition load status from "Pending" to "ApprovedPaid"',
    );
  });

  it("throws for self-transitions", () => {
    expect(() => assertValidTransition("Pending", "Pending")).toThrow();
  });
});
