import { describe, expect, it, vi } from "vitest";
import { FinancialsLockedError, LoadEditBlockedByStatusError, updateLoad } from "./repository.js";

const mockTransaction = vi.hoisted(() => vi.fn());

vi.mock("@twy/db", () => ({
  db: { transaction: mockTransaction },
  load: { id: {}, status: {}, financialsLockedAt: {}, brokerId: {}, carrierId: {} },
  loadComment: {},
  loadFiles: { loadId: {}, fileId: {} },
  loadStop: { loadId: {}, kind: {} },
  loadRefSeq: { year: {}, lastValue: {} },
  branch: { id: {} },
  carrier: { id: {}, carrierName: {}, mcDotNumber: {}, paymentMethod: {}, paymentTerms: {} },
  outsideBroker: {
    id: {},
    brokerName: {},
    contactName: {},
    phone: {},
    email: {},
    paymentMethod: {},
    paymentTerms: {},
  },
  file: { id: {} },
  paymentOrder: {},
  users: {},
}));

type MockRow = { id: string; status: string; financialsLockedAt: Date | null };

function makeSelectTx(rows: MockRow[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });
  return { select } as unknown as Parameters<Parameters<typeof mockTransaction>[0]>[0];
}

describe("updateLoad — status gate (Delivered / Declined)", () => {
  it("throws LoadEditBlockedByStatusError for Delivered", async () => {
    const tx = makeSelectTx([{ id: "load-1", status: "Delivered", financialsLockedAt: null }]);
    mockTransaction.mockImplementation((cb: (arg: typeof tx) => unknown) => cb(tx));
    await expect(updateLoad("load-1", {})).rejects.toBeInstanceOf(LoadEditBlockedByStatusError);
  });

  it("throws LoadEditBlockedByStatusError for Declined", async () => {
    const tx = makeSelectTx([{ id: "load-1", status: "Declined", financialsLockedAt: null }]);
    mockTransaction.mockImplementation((cb: (arg: typeof tx) => unknown) => cb(tx));
    await expect(updateLoad("load-1", {})).rejects.toBeInstanceOf(LoadEditBlockedByStatusError);
  });

  it("error for Delivered carries code and loadStatus", async () => {
    const tx = makeSelectTx([{ id: "load-1", status: "Delivered", financialsLockedAt: null }]);
    mockTransaction.mockImplementation((cb: (arg: typeof tx) => unknown) => cb(tx));
    await expect(updateLoad("load-1", {})).rejects.toMatchObject({
      code: "LOAD_EDIT_BLOCKED_BY_STATUS",
      loadStatus: "Delivered",
    });
  });

  it("error for Declined carries code and loadStatus", async () => {
    const tx = makeSelectTx([{ id: "load-1", status: "Declined", financialsLockedAt: null }]);
    mockTransaction.mockImplementation((cb: (arg: typeof tx) => unknown) => cb(tx));
    await expect(updateLoad("load-1", {})).rejects.toMatchObject({
      code: "LOAD_EDIT_BLOCKED_BY_STATUS",
      loadStatus: "Declined",
    });
  });
});

describe("updateLoad — allowed statuses (Pending / Approved / Hold)", () => {
  it.each([
    "Pending",
    "Approved",
    "Hold",
  ] as const)("resolves true for status %s with empty payload", async (status) => {
    const tx = makeSelectTx([{ id: "load-1", status, financialsLockedAt: null }]);
    mockTransaction.mockImplementation((cb: (arg: typeof tx) => unknown) => cb(tx));
    await expect(updateLoad("load-1", {})).resolves.toBe(true);
  });

  it("returns false when load is not found", async () => {
    const tx = makeSelectTx([]);
    mockTransaction.mockImplementation((cb: (arg: typeof tx) => unknown) => cb(tx));
    await expect(updateLoad("load-1", {})).resolves.toBe(false);
  });
});

describe("updateLoad — financials gate preserved on Approved", () => {
  it("throws FinancialsLockedError when touching brokerRate on a locked Approved load", async () => {
    const tx = makeSelectTx([{ id: "load-1", status: "Approved", financialsLockedAt: new Date() }]);
    mockTransaction.mockImplementation((cb: (arg: typeof tx) => unknown) => cb(tx));
    await expect(updateLoad("load-1", { brokerRate: 1000 })).rejects.toBeInstanceOf(
      FinancialsLockedError,
    );
  });

  it("throws FinancialsLockedError when touching carrierRate on a locked Approved load", async () => {
    const tx = makeSelectTx([{ id: "load-1", status: "Approved", financialsLockedAt: new Date() }]);
    mockTransaction.mockImplementation((cb: (arg: typeof tx) => unknown) => cb(tx));
    await expect(updateLoad("load-1", { carrierRate: 800 })).rejects.toBeInstanceOf(
      FinancialsLockedError,
    );
  });
});
