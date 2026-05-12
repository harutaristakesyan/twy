import { describe, expect, it } from "vitest";
import type { UserPermissionsContext } from "../team/repository.js";
import {
  assertValidTransition,
  getAllowedAndPermittedTransitions,
  getAllowedTransitions,
  InvalidTransitionError,
  isValidTransition,
} from "./status-machine.js";

const makeCtx = (perms: Record<string, Record<string, boolean>>) =>
  ({ permissions: perms }) as unknown as UserPermissionsContext;

describe("isValidTransition — allowed transitions", () => {
  it.each([
    ["Pending", "Approved"],
    ["Pending", "Hold"],
    ["Pending", "Declined"],
    ["Pending", "Delivered"],
    ["Approved", "Hold"],
    ["Approved", "Declined"],
    ["Approved", "Delivered"],
    ["Hold", "Approved"],
    ["Delivered", "Hold"],
  ] as const)("allows %s → %s", (from, to) => {
    expect(isValidTransition(from, to)).toBe(true);
  });
});

describe("isValidTransition — forbidden transitions", () => {
  it.each([
    ["Hold", "Pending"],
    ["Declined", "Pending"],
    ["Declined", "Approved"],
    ["Delivered", "Approved"],
    ["Pending", "Pending"],
  ] as const)("forbids %s → %s", (from, to) => {
    expect(isValidTransition(from, to)).toBe(false);
  });
});

describe("getAllowedTransitions", () => {
  it("Pending → Approved, Hold, Declined, Delivered", () => {
    expect(getAllowedTransitions("Pending").sort()).toEqual([
      "Approved",
      "Declined",
      "Delivered",
      "Hold",
    ]);
  });

  it("Approved → Hold, Declined, Delivered", () => {
    expect(getAllowedTransitions("Approved").sort()).toEqual(["Declined", "Delivered", "Hold"]);
  });

  it("Hold → Approved only", () => {
    expect(getAllowedTransitions("Hold")).toEqual(["Approved"]);
  });

  it("Delivered → Hold only", () => {
    expect(getAllowedTransitions("Delivered")).toEqual(["Hold"]);
  });

  it("Declined is terminal — no allowed transitions", () => {
    expect(getAllowedTransitions("Declined")).toEqual([]);
  });
});

describe("can never return to Pending invariant", () => {
  it.each([
    "Approved",
    "Hold",
    "Declined",
    "Delivered",
  ] as const)("%s cannot transition to Pending", (status) => {
    expect(getAllowedTransitions(status)).not.toContain("Pending");
  });
});

describe("assertValidTransition", () => {
  it("throws InvalidTransitionError for forbidden transitions", () => {
    expect(() => assertValidTransition("Declined", "Pending")).toThrow(InvalidTransitionError);
  });

  it("error carries from, to, allowed, and code fields", () => {
    try {
      assertValidTransition("Declined", "Approved");
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidTransitionError);
      const e = err as InvalidTransitionError;
      expect(e.from).toBe("Declined");
      expect(e.to).toBe("Approved");
      expect(e.allowed).toEqual([]);
      expect(e.code).toBe("invalid_transition");
    }
  });

  it("does not throw for valid transitions", () => {
    expect(() => assertValidTransition("Pending", "Approved")).not.toThrow();
  });
});

describe("getAllowedAndPermittedTransitions", () => {
  it("returns intersection of state machine and permissions", () => {
    const ctx = makeCtx({ loads: { "transition:Approved": true, "transition:Hold": true } });
    const result = getAllowedAndPermittedTransitions(ctx, "Pending");
    expect(result).toContain("Approved");
    expect(result).toContain("Hold");
    expect(result).not.toContain("Declined");
  });

  it("returns empty when no transitions permitted", () => {
    const ctx = makeCtx({ loads: {} });
    expect(getAllowedAndPermittedTransitions(ctx, "Pending")).toEqual([]);
  });
});
