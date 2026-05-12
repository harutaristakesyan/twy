import { describe, expect, it } from "vitest";
import { expandRegistry, isKnownPermission, PERMISSION_REGISTRY } from "./registry.js";

describe("PERMISSION_REGISTRY", () => {
  it("covers all 12 entities", () => {
    expect(Object.keys(PERMISSION_REGISTRY)).toHaveLength(12);
  });

  it("loads has transitions", () => {
    expect(PERMISSION_REGISTRY.loads.transitions).toContain("Approved");
    expect(PERMISSION_REGISTRY.loads.transitions).toHaveLength(5);
  });

  it("payment_orders has transitions", () => {
    expect(PERMISSION_REGISTRY.payment_orders.transitions).toHaveLength(7);
  });
});

describe("isKnownPermission", () => {
  it("returns true for valid base action", () => {
    expect(isKnownPermission("loads", "view")).toBe(true);
    expect(isKnownPermission("loads", "add")).toBe(true);
    expect(isKnownPermission("loads", "delete")).toBe(true);
  });

  it("returns true for valid transition action", () => {
    expect(isKnownPermission("loads", "transition:Approved")).toBe(true);
    expect(isKnownPermission("payment_orders", "transition:Paid")).toBe(true);
  });

  it("returns false for unknown entity", () => {
    expect(isKnownPermission("unknown_entity", "view")).toBe(false);
  });

  it("returns false for transition on entity without transitions", () => {
    expect(isKnownPermission("brokers", "transition:Approved")).toBe(false);
  });

  it("returns false for nonexistent status in transition", () => {
    expect(isKnownPermission("loads", "transition:Nonexistent")).toBe(false);
  });
});

describe("expandRegistry", () => {
  it("returns one entry per entity", () => {
    const entries = expandRegistry();
    expect(entries).toHaveLength(Object.keys(PERMISSION_REGISTRY).length);
  });

  it("includes transitions only for entities that have them", () => {
    const entries = expandRegistry();
    const loads = entries.find((e) => e.name === "loads");
    const brokers = entries.find((e) => e.name === "brokers");
    expect(loads?.transitions).toBeDefined();
    expect(brokers?.transitions).toBeUndefined();
  });
});
