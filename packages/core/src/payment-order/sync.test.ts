import type { LoadStatus } from "@twy/db";
import { describe, expect, it, vi } from "vitest";
import {
  computePaymentOrderFinancials,
  getPaymentStatusForLoadStatus,
  syncPaymentOrderFromLoad,
} from "./repository.js";

// ---------------------------------------------------------------------------
// Pure mapping tests
// ---------------------------------------------------------------------------

describe("getPaymentStatusForLoadStatus — mapping table", () => {
  it.each([
    ["Approved", "Pending"],
    ["Hold", "Hold"],
    ["Declined", "Declined"],
    ["Delivered", "ReadyForInvoice"],
  ] as const)("Load %s → PO %s", (loadStatus, expectedPaymentStatus) => {
    expect(getPaymentStatusForLoadStatus(loadStatus)).toBe(expectedPaymentStatus);
  });

  it("returns null for Pending (no PO sync on Pending)", () => {
    expect(getPaymentStatusForLoadStatus("Pending")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// syncPaymentOrderFromLoad — behaviour tests with a mocked tx
// ---------------------------------------------------------------------------

type MockTxResult = {
  tx: Parameters<typeof syncPaymentOrderFromLoad>[0];
  mocks: {
    updateMock: ReturnType<typeof vi.fn>;
    setMock: ReturnType<typeof vi.fn>;
    whereUpdate: ReturnType<typeof vi.fn>;
  };
};

function makeTx(poId: string | null): MockTxResult {
  const whereUpdate = vi.fn().mockResolvedValue([]);
  const setMock = vi.fn().mockReturnValue({ where: whereUpdate });
  const updateMock = vi.fn().mockReturnValue({ set: setMock });

  const whereSelect = vi.fn().mockResolvedValue(poId ? [{ id: poId }] : []);
  const fromMock = vi.fn().mockReturnValue({ where: whereSelect });
  const selectMock = vi.fn().mockReturnValue({ from: fromMock });

  return {
    tx: { select: selectMock, update: updateMock } as unknown as Parameters<
      typeof syncPaymentOrderFromLoad
    >[0],
    mocks: { updateMock, setMock, whereUpdate },
  };
}

describe("syncPaymentOrderFromLoad — no PO exists", () => {
  it.each([
    "Approved",
    "Hold",
    "Declined",
    "Delivered",
  ] as LoadStatus[])("no-op when PO is absent (Load → %s)", async (toStatus) => {
    const { tx, mocks } = makeTx(null);
    await syncPaymentOrderFromLoad(tx, "load-1", toStatus);
    expect(mocks.updateMock).not.toHaveBeenCalled();
  });
});

describe("syncPaymentOrderFromLoad — Pending is always a no-op", () => {
  it("does not touch the PO even if one exists", async () => {
    const { tx, mocks } = makeTx("po-1");
    await syncPaymentOrderFromLoad(tx, "load-1", "Pending");
    expect(mocks.updateMock).not.toHaveBeenCalled();
  });
});

describe("syncPaymentOrderFromLoad — all four mappings update the PO", () => {
  it.each([
    ["Approved", "Pending"],
    ["Hold", "Hold"],
    ["Declined", "Declined"],
    ["Delivered", "ReadyForInvoice"],
  ] as const)("Load → %s sets paymentStatus to %s", async (toStatus, expectedPaymentStatus) => {
    const { tx, mocks } = makeTx("po-42");
    await syncPaymentOrderFromLoad(tx, "load-1", toStatus);
    expect(mocks.updateMock).toHaveBeenCalledOnce();
    expect(mocks.setMock).toHaveBeenCalledWith(
      expect.objectContaining({ paymentStatus: expectedPaymentStatus }),
    );
    expect(mocks.whereUpdate).toHaveBeenCalledOnce();
  });
});

describe("syncPaymentOrderFromLoad — overwrites any existing PO status", () => {
  it("updates even when PO is already in the target status (idempotent write)", async () => {
    const { tx, mocks } = makeTx("po-99");
    await syncPaymentOrderFromLoad(tx, "load-1", "Hold");
    expect(mocks.setMock).toHaveBeenCalledWith(expect.objectContaining({ paymentStatus: "Hold" }));
  });

  it("overwrites a downstream status (e.g. Paid) when Load transitions to Hold", async () => {
    const { tx, mocks } = makeTx("po-99");
    await syncPaymentOrderFromLoad(tx, "load-1", "Hold");
    expect(mocks.setMock).toHaveBeenCalledWith(expect.objectContaining({ paymentStatus: "Hold" }));
  });
});

// ---------------------------------------------------------------------------
// computePaymentOrderFinancials — pure formula tests
// ---------------------------------------------------------------------------

describe("computePaymentOrderFinancials", () => {
  it("computes all fields when customerRate is set", () => {
    const result = computePaymentOrderFinancials({
      customerRate: "1000",
      carrierRate: "800",
      serviceFee: "30",
    });
    expect(result).toEqual({
      brokerReceivable: "1000",
      carrierPayable: "800",
      incomePercentage: "20.00",
      profit: "230",
    });
  });

  it("returns null brokerReceivable and derived fields when customerRate is null", () => {
    const result = computePaymentOrderFinancials({
      customerRate: null,
      carrierRate: "800",
      serviceFee: "30",
    });
    expect(result).toEqual({
      brokerReceivable: null,
      carrierPayable: "800",
      incomePercentage: null,
      profit: null,
    });
  });

  it("defaults serviceFee to 30 when null", () => {
    const result = computePaymentOrderFinancials({
      customerRate: "1000",
      carrierRate: "800",
      serviceFee: null,
    });
    expect(result.profit).toBe("230");
  });

  it("returns null incomePercentage when customerRate is 0", () => {
    const result = computePaymentOrderFinancials({
      customerRate: "0",
      carrierRate: "800",
      serviceFee: "30",
    });
    expect(result.incomePercentage).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// syncPaymentOrderFromLoad — financials sync on Approved / Delivered
// ---------------------------------------------------------------------------

const sampleFinancials = { customerRate: "1000", carrierRate: "800", serviceFee: "30" };

describe("syncPaymentOrderFromLoad — financials synced for Approved and Delivered", () => {
  it.each([
    ["Approved", "Pending"],
    ["Delivered", "ReadyForInvoice"],
  ] as const)("syncs paymentStatus + brokerReceivable + carrierPayable for Load → %s", async (toStatus, expectedPaymentStatus) => {
    const { tx, mocks } = makeTx("po-1");
    await syncPaymentOrderFromLoad(tx, "load-1", toStatus, sampleFinancials);
    expect(mocks.setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: expectedPaymentStatus,
        brokerReceivable: "1000",
        carrierPayable: "800",
      }),
    );
  });

  it("does NOT include financials for Hold even when financials param provided", async () => {
    const { tx, mocks } = makeTx("po-1");
    await syncPaymentOrderFromLoad(tx, "load-1", "Hold", sampleFinancials);
    const setArg = mocks.setMock.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg).not.toHaveProperty("brokerReceivable");
    expect(setArg).not.toHaveProperty("carrierPayable");
  });

  it("does NOT include financials for Declined even when financials param provided", async () => {
    const { tx, mocks } = makeTx("po-1");
    await syncPaymentOrderFromLoad(tx, "load-1", "Declined", sampleFinancials);
    const setArg = mocks.setMock.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg).not.toHaveProperty("brokerReceivable");
    expect(setArg).not.toHaveProperty("carrierPayable");
  });

  it("syncs null brokerReceivable when customerRate is null", async () => {
    const { tx, mocks } = makeTx("po-1");
    await syncPaymentOrderFromLoad(tx, "load-1", "Approved", {
      customerRate: null,
      carrierRate: "800",
      serviceFee: "30",
    });
    expect(mocks.setMock).toHaveBeenCalledWith(
      expect.objectContaining({ brokerReceivable: null, carrierPayable: "800" }),
    );
  });

  it("does not include financials when financials param omitted (backward compat)", async () => {
    const { tx, mocks } = makeTx("po-1");
    await syncPaymentOrderFromLoad(tx, "load-1", "Approved");
    const setArg = mocks.setMock.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg).not.toHaveProperty("brokerReceivable");
  });
});
