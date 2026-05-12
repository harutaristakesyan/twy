import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePermission } from "./usePermission";

// Mock useCurrentUser
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    permissions: {
      loads: {
        view: true,
        edit: false,
        "transition:Approved": true,
        "transition:Declined": false,
      },
    },
  }),
}));

describe("usePermission", () => {
  it("returns true for granted base action", () => {
    const { result } = renderHook(() => usePermission("loads", "view"));
    expect(result.current).toBe(true);
  });

  it("returns false for denied base action", () => {
    const { result } = renderHook(() => usePermission("loads", "edit"));
    expect(result.current).toBe(false);
  });

  it("returns true for permitted transition", () => {
    const { result } = renderHook(() => usePermission("loads", "transition", "Approved"));
    expect(result.current).toBe(true);
  });

  it("returns false for denied transition", () => {
    const { result } = renderHook(() => usePermission("loads", "transition", "Declined"));
    expect(result.current).toBe(false);
  });

  it("returns false for unknown entity", () => {
    const { result } = renderHook(() => usePermission("unknown", "view"));
    expect(result.current).toBe(false);
  });
});
