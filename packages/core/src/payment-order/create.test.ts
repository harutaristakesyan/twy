import { describe, expect, it, vi } from "vitest";
import {
  createPaymentOrderForLoad,
  LoadNotFoundError,
  PaymentOrderAlreadyExistsError,
  PaymentOrderFinancialsMissingError,
} from "./repository.js";

type LoadRow = {
  branchId: string;
  carrierId: string | null;
  customerRate: string | null;
  carrierRate: string | null;
  serviceFee: string | null;
  chargeAmount: string | null;
};

const LOAD_ROW: LoadRow = {
  branchId: "branch-1",
  carrierId: "carrier-1",
  customerRate: "1000",
  carrierRate: "800",
  serviceFee: "30",
  chargeAmount: null,
};

/**
 * Build a tx mock that responds to the three select shapes used in
 * createPaymentOrderForLoad:
 *   1. select(loadCols).from(load).where(...)              → loadRows
 *   2. select({ id }).from(paymentOrder).where(...)         → existingRows
 *   3. insert(paymentOrder).values(...).onConflictDoNothing(...).returning(...) → insertRows
 */
function makeTx({
  loadRows,
  existingRows,
  insertRows,
}: {
  loadRows: LoadRow[];
  existingRows: { id: string }[];
  insertRows: { id: string }[];
}) {
  let selectCall = 0;
  const select = vi.fn().mockImplementation(() => {
    const callIndex = selectCall++;
    const where = vi.fn().mockImplementation(() => {
      return callIndex === 0 ? Promise.resolve(loadRows) : Promise.resolve(existingRows);
    });
    return { from: vi.fn().mockReturnValue({ where }) };
  });

  const returning = vi.fn().mockResolvedValue(insertRows);
  const onConflictDoNothing = vi.fn().mockReturnValue({ returning });
  const values = vi.fn().mockReturnValue({ onConflictDoNothing });
  const insert = vi.fn().mockReturnValue({ values });

  return {
    tx: { select, insert } as unknown as Parameters<typeof createPaymentOrderForLoad>[0],
    mocks: { insert, values, onConflictDoNothing, returning },
  };
}

describe("createPaymentOrderForLoad — non-strict (auto-flow)", () => {
  it("silently returns null when load is missing", async () => {
    const { tx, mocks } = makeTx({ loadRows: [], existingRows: [], insertRows: [] });
    const result = await createPaymentOrderForLoad(tx, "load-1", "user-1");
    expect(result).toBeNull();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("silently returns null on duplicate (onConflictDoNothing wins)", async () => {
    const { tx } = makeTx({
      loadRows: [LOAD_ROW],
      existingRows: [],
      insertRows: [],
    });
    const result = await createPaymentOrderForLoad(tx, "load-1", "user-1");
    expect(result).toBeNull();
  });

  it("inserts and returns id on success", async () => {
    const { tx, mocks } = makeTx({
      loadRows: [LOAD_ROW],
      existingRows: [],
      insertRows: [{ id: "po-generated" }],
    });
    const result = await createPaymentOrderForLoad(tx, "load-1", "user-1");
    expect(result).not.toBeNull();
    expect(mocks.values).toHaveBeenCalledOnce();
    const inserted = mocks.values.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.brokerReceivable).toBe("1000");
    expect(inserted.carrierPayable).toBe("800");
    expect(inserted.branchId).toBe("branch-1");
    expect(inserted.createdBy).toBe("user-1");
  });
});

describe("createPaymentOrderForLoad — strict (manual flow)", () => {
  it("throws LoadNotFoundError when load is missing", async () => {
    const { tx } = makeTx({ loadRows: [], existingRows: [], insertRows: [] });
    await expect(
      createPaymentOrderForLoad(tx, "load-1", "user-1", { strict: true }),
    ).rejects.toBeInstanceOf(LoadNotFoundError);
  });

  it("throws PaymentOrderFinancialsMissingError when carrierRate is null", async () => {
    const { tx } = makeTx({
      loadRows: [{ ...LOAD_ROW, carrierRate: null }],
      existingRows: [],
      insertRows: [],
    });
    await expect(
      createPaymentOrderForLoad(tx, "load-1", "user-1", { strict: true }),
    ).rejects.toBeInstanceOf(PaymentOrderFinancialsMissingError);
  });

  it("throws PaymentOrderAlreadyExistsError when a PO already exists", async () => {
    const { tx } = makeTx({
      loadRows: [LOAD_ROW],
      existingRows: [{ id: "po-existing" }],
      insertRows: [],
    });
    await expect(
      createPaymentOrderForLoad(tx, "load-1", "user-1", { strict: true }),
    ).rejects.toBeInstanceOf(PaymentOrderAlreadyExistsError);
  });

  it("inserts and returns id on success — payload matches auto-flow", async () => {
    const { tx, mocks } = makeTx({
      loadRows: [LOAD_ROW],
      existingRows: [],
      insertRows: [{ id: "po-generated" }],
    });
    const result = await createPaymentOrderForLoad(tx, "load-1", "user-1", { strict: true });
    expect(result).not.toBeNull();
    const strictPayload = mocks.values.mock.calls[0][0] as Record<string, unknown>;

    // Compare against the non-strict payload — they must be byte-identical.
    const auto = makeTx({
      loadRows: [LOAD_ROW],
      existingRows: [],
      insertRows: [{ id: "po-generated-2" }],
    });
    await createPaymentOrderForLoad(auto.tx, "load-1", "user-1");
    const autoPayload = auto.mocks.values.mock.calls[0][0] as Record<string, unknown>;

    // Ignore the random id — every other field must match.
    delete strictPayload.id;
    delete autoPayload.id;
    expect(strictPayload).toEqual(autoPayload);
  });
});
