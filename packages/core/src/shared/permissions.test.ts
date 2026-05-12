import { describe, expect, it } from "vitest";
import type { UserPermissionsContext } from "../team/repository.js";
import {
  assertPermission,
  assertTransition,
  getPermittedTransitions,
  hasPermission,
} from "./permissions.js";

// Build a minimal fixture — only the fields hasPermission/assertPermission/etc. need
const makeCtx = (perms: Record<string, Record<string, boolean>>): UserPermissionsContext =>
  ({
    userId: "user-1",
    teamId: "team-1",
    branchId: null,
    branchRestricted: false,
    onlyOwnData: false,
    permissions: perms,
  }) as UserPermissionsContext;

describe("hasPermission", () => {
  it("returns true when permission is granted", () => {
    const ctx = makeCtx({ loads: { view: true, edit: false } });
    expect(hasPermission(ctx, "loads", "view")).toBe(true);
  });

  it("returns false when permission is denied", () => {
    const ctx = makeCtx({ loads: { view: false, edit: false } });
    expect(hasPermission(ctx, "loads", "view")).toBe(false);
  });

  it("returns false for unknown entity", () => {
    const ctx = makeCtx({});
    expect(hasPermission(ctx, "unknown", "view")).toBe(false);
  });

  it("handles transition:* keys", () => {
    const ctx = makeCtx({ loads: { "transition:Approved": true } });
    expect(hasPermission(ctx, "loads", "transition:Approved")).toBe(true);
    expect(hasPermission(ctx, "loads", "transition:Declined")).toBe(false);
  });
});

describe("assertPermission", () => {
  it("does not throw when permission is granted", () => {
    const ctx = makeCtx({ loads: { edit: true } });
    expect(() => assertPermission(ctx, "loads", "edit")).not.toThrow();
  });

  it("throws 403 with permissionMissing when denied", () => {
    const ctx = makeCtx({ loads: { edit: false } });
    expect(() => assertPermission(ctx, "loads", "edit")).toThrow();
    try {
      assertPermission(ctx, "loads", "edit");
    } catch (e) {
      expect((e as { status: number }).status).toBe(403);
      expect((e as { permissionMissing: unknown }).permissionMissing).toEqual({
        entity: "loads",
        action: "edit",
      });
    }
  });
});

describe("assertTransition", () => {
  it("does not throw when transition is permitted", () => {
    const ctx = makeCtx({ loads: { "transition:Approved": true } });
    expect(() => assertTransition(ctx, "loads", "Approved")).not.toThrow();
  });

  it("throws 403 with permissionMissing for denied transition", () => {
    const ctx = makeCtx({ loads: {} });
    try {
      assertTransition(ctx, "loads", "Declined");
    } catch (e) {
      expect((e as { status: number }).status).toBe(403);
      expect((e as { permissionMissing: { action: string } }).permissionMissing.action).toBe(
        "transition:Declined",
      );
    }
  });
});

describe("getPermittedTransitions", () => {
  it("returns intersection of state-machine and permission lists", () => {
    const ctx = makeCtx({
      loads: { "transition:Approved": true, "transition:Hold": false, "transition:Declined": true },
    });
    const result = getPermittedTransitions(ctx, "loads", ["Approved", "Hold", "Declined"]);
    expect(result).toEqual(["Approved", "Declined"]);
  });

  it("returns empty array when no transitions are permitted", () => {
    const ctx = makeCtx({ loads: {} });
    const result = getPermittedTransitions(ctx, "loads", ["Approved", "Hold"]);
    expect(result).toEqual([]);
  });
});
