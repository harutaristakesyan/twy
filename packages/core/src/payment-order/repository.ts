import { randomUUID } from "node:crypto";
import {
  branch,
  type ChargeSide,
  carrier,
  db,
  file,
  type LoadStatus,
  load,
  type PaymentStatus,
  paymentOrder,
  paymentOrderFiles,
} from "@twy/db";
import type { SQL } from "drizzle-orm";
import { and, count, eq, ilike, inArray } from "drizzle-orm";
import type { AdvancedFilter } from "../shared/advanced-filter-schema.js";
import type { PaymentOrderInvoice, PaymentOrderResponse } from "./response.js";

export class PaymentOrderRequiredError extends Error {
  readonly code = "payment_order_required";
  constructor() {
    super("A payment order is required before delivering a load");
    this.name = "PaymentOrderRequiredError";
  }
}

export class PaymentOrderAlreadyExistsError extends Error {
  readonly code = "payment_order_already_exists";
  constructor(public readonly loadId: string) {
    super(`A payment order already exists for load ${loadId}`);
    this.name = "PaymentOrderAlreadyExistsError";
  }
}

export class PaymentOrderFinancialsMissingError extends Error {
  readonly code = "payment_order_financials_missing";
  constructor(public readonly missing: string[]) {
    super(`Cannot create payment order — missing fields: ${missing.join(", ")}`);
    this.name = "PaymentOrderFinancialsMissingError";
  }
}

export class LoadNotFoundError extends Error {
  readonly code = "load_not_found";
  constructor(public readonly loadId: string) {
    super(`Load ${loadId} not found`);
    this.name = "LoadNotFoundError";
  }
}

export const computePaymentOrderFinancials = (financials: {
  brokerRate: string | null;
  carrierRate: string;
  serviceFee: string | null;
}): {
  brokerReceivable: string | null;
  carrierPayable: string;
  incomePercentage: string | null;
  profit: string | null;
} => {
  const brokerRate = financials.brokerRate != null ? Number(financials.brokerRate) : null;
  const carrierRate = Number(financials.carrierRate);
  const serviceFee = financials.serviceFee != null ? Number(financials.serviceFee) : 30;
  const income = brokerRate != null ? brokerRate - carrierRate : null;
  const incomePercentage =
    income != null && brokerRate != null && brokerRate !== 0 ? (income / brokerRate) * 100 : null;
  const profit = income != null ? income + serviceFee : null;

  return {
    brokerReceivable: brokerRate != null ? brokerRate.toString() : null,
    carrierPayable: carrierRate.toString(),
    incomePercentage: incomePercentage != null ? incomePercentage.toFixed(2) : null,
    profit: profit != null ? profit.toString() : null,
  };
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const numericToNumber = (value: string | null | undefined): number | null =>
  value == null ? null : Number(value);

const mapRow = (
  row: typeof paymentOrder.$inferSelect,
  referenceNumber: string,
  branchName: string,
  carrierName: string | null,
  chargeSide: ChargeSide | null,
  invoices: PaymentOrderInvoice[],
): PaymentOrderResponse => ({
  id: row.id,
  loadId: row.loadId,
  referenceNumber,
  branchId: row.branchId,
  branchName,
  carrierId: row.carrierId ?? null,
  carrierName,
  brokerReceivable: numericToNumber(row.brokerReceivable),
  carrierPayable: Number(row.carrierPayable),
  serviceFee: Number(row.serviceFee),
  incomePercentage: numericToNumber(row.incomePercentage),
  charges: numericToNumber(row.charges),
  chargeSide: chargeSide ?? null,
  profit: numericToNumber(row.profit),
  carrierPaidAmount: numericToNumber(row.carrierPaidAmount),
  carrierPaidDate: row.carrierPaidDate ?? null,
  brokerReceivedAmount: numericToNumber(row.brokerReceivedAmount),
  brokerReceivedDate: row.brokerReceivedDate ?? null,
  invoices,
  paymentStatus: row.paymentStatus,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const fetchInvoicesForPaymentOrders = async (
  poIds: string[],
): Promise<Map<string, PaymentOrderInvoice[]>> => {
  if (poIds.length === 0) return new Map();
  const rows = await db
    .select({
      paymentOrderId: paymentOrderFiles.paymentOrderId,
      fileId: paymentOrderFiles.fileId,
      fileName: file.fileName,
    })
    .from(paymentOrderFiles)
    .innerJoin(file, eq(file.id, paymentOrderFiles.fileId))
    .where(inArray(paymentOrderFiles.paymentOrderId, poIds));

  const map = new Map<string, PaymentOrderInvoice[]>();
  for (const row of rows) {
    if (!map.has(row.paymentOrderId)) map.set(row.paymentOrderId, []);
    map.get(row.paymentOrderId)?.push({ fileId: row.fileId, fileName: row.fileName });
  }
  return map;
};

export interface CreatePaymentOrderForLoadOptions {
  /** When true, throws on missing load, existing PO, or missing financials. Default: silent no-op (auto-flow). */
  strict?: boolean;
}

export const createPaymentOrderForLoad = async (
  tx: Tx,
  loadId: string,
  userId: string,
  options: CreatePaymentOrderForLoadOptions = {},
): Promise<{ id: string } | null> => {
  const [loadRow] = await tx
    .select({
      branchId: load.branchId,
      carrierId: load.carrierId,
      brokerRate: load.brokerRate,
      carrierRate: load.carrierRate,
      serviceFee: load.serviceFee,
      chargeAmount: load.chargeAmount,
    })
    .from(load)
    .where(eq(load.id, loadId));

  if (!loadRow) {
    if (options.strict) throw new LoadNotFoundError(loadId);
    return null;
  }

  if (options.strict) {
    const missing: string[] = [];
    if (loadRow.carrierRate == null) missing.push("carrierRate");
    if (missing.length > 0) throw new PaymentOrderFinancialsMissingError(missing);

    const [existing] = await tx
      .select({ id: paymentOrder.id })
      .from(paymentOrder)
      .where(eq(paymentOrder.loadId, loadId));
    if (existing) throw new PaymentOrderAlreadyExistsError(loadId);
  }

  const brokerRate = numericToNumber(loadRow.brokerRate);
  const carrierRate = Number(loadRow.carrierRate);
  const serviceFee = numericToNumber(loadRow.serviceFee) ?? 30;
  const income = brokerRate != null ? brokerRate - carrierRate : null;
  const incomePercentage =
    income != null && brokerRate != null && brokerRate !== 0 ? (income / brokerRate) * 100 : null;
  const profit = income != null ? income + serviceFee : null;

  const id = randomUUID();
  const inserted = await tx
    .insert(paymentOrder)
    .values({
      id,
      loadId,
      branchId: loadRow.branchId,
      carrierId: loadRow.carrierId ?? null,
      brokerReceivable: brokerRate != null ? brokerRate.toString() : null,
      carrierPayable: carrierRate.toString(),
      serviceFee: serviceFee.toString(),
      incomePercentage: incomePercentage != null ? incomePercentage.toFixed(2) : null,
      charges: loadRow.chargeAmount ?? null,
      profit: profit != null ? profit.toString() : null,
      createdBy: userId,
    })
    .onConflictDoNothing({ target: paymentOrder.loadId })
    .returning({ id: paymentOrder.id });

  if (inserted.length === 0) {
    if (options.strict) throw new PaymentOrderAlreadyExistsError(loadId);
    return null;
  }
  return { id };
};

const LOAD_STATUS_TO_PAYMENT_STATUS: Partial<Record<LoadStatus, PaymentStatus>> = {
  Approved: "Pending",
  Hold: "Hold",
  Declined: "Declined",
  Delivered: "ReadyForInvoice",
};

export const getPaymentStatusForLoadStatus = (loadStatus: LoadStatus): PaymentStatus | null =>
  LOAD_STATUS_TO_PAYMENT_STATUS[loadStatus] ?? null;

export const syncPaymentOrderFromLoad = async (
  tx: Tx,
  loadId: string,
  toStatus: LoadStatus,
  financials?: {
    brokerRate: string | null;
    carrierRate: string;
    serviceFee: string | null;
  },
): Promise<void> => {
  const targetStatus = getPaymentStatusForLoadStatus(toStatus);
  if (!targetStatus) return;

  const [existing] = await tx
    .select({ id: paymentOrder.id })
    .from(paymentOrder)
    .where(eq(paymentOrder.loadId, loadId));

  if (!existing) return;

  const setPayload: Partial<typeof paymentOrder.$inferInsert> = {
    paymentStatus: targetStatus,
    updatedAt: new Date(),
  };

  if (financials && (toStatus === "Approved" || toStatus === "Delivered")) {
    const computed = computePaymentOrderFinancials(financials);
    setPayload.brokerReceivable = computed.brokerReceivable;
    setPayload.carrierPayable = computed.carrierPayable;
    setPayload.incomePercentage = computed.incomePercentage;
    setPayload.profit = computed.profit;
    // charges (PO.charges = Load.chargeAmount) is intentionally excluded — it is locked
    // at the Approved snapshot and not re-synced on subsequent transitions.
  }

  await tx.update(paymentOrder).set(setPayload).where(eq(paymentOrder.id, existing.id));
};

function buildPaymentOrderFilterConditions(filter: AdvancedFilter): SQL<unknown>[] {
  const conds: SQL<unknown>[] = [];
  if (filter.branchId) conds.push(eq(paymentOrder.branchId, filter.branchId));
  return conds;
}

export interface ListPaymentOrdersInput {
  page: number;
  limit: number;
  branchId?: string;
  query?: string;
  advancedFilter?: AdvancedFilter;
}

export const getPaymentOrderById = async (
  paymentOrderId: string,
): Promise<PaymentOrderResponse | null> => {
  const [row] = await db
    .select({
      paymentOrder: paymentOrder,
      referenceNumber: load.referenceNumber,
      branchName: branch.name,
      carrierName: carrier.carrierName,
      chargeSide: load.chargeSide,
    })
    .from(paymentOrder)
    .innerJoin(load, eq(load.id, paymentOrder.loadId))
    .innerJoin(branch, eq(branch.id, paymentOrder.branchId))
    .leftJoin(carrier, eq(carrier.id, paymentOrder.carrierId))
    .where(eq(paymentOrder.id, paymentOrderId));

  if (!row) return null;

  const invoicesMap = await fetchInvoicesForPaymentOrders([row.paymentOrder.id]);
  return mapRow(
    row.paymentOrder,
    row.referenceNumber,
    row.branchName,
    row.carrierName ?? null,
    row.chargeSide ?? null,
    invoicesMap.get(row.paymentOrder.id) ?? [],
  );
};

export const listPaymentOrders = async (
  input: ListPaymentOrdersInput,
): Promise<{ paymentOrders: PaymentOrderResponse[]; total: number }> => {
  const offset = input.page * input.limit;

  const filterConds = input.advancedFilter
    ? buildPaymentOrderFilterConditions(input.advancedFilter)
    : [];

  const queryCond = input.query ? ilike(load.referenceNumber, `%${input.query}%`) : undefined;

  const scopeBranchCond = input.branchId ? eq(paymentOrder.branchId, input.branchId) : undefined;

  const whereClause = and(scopeBranchCond, queryCond, ...filterConds);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        paymentOrder: paymentOrder,
        referenceNumber: load.referenceNumber,
        branchName: branch.name,
        carrierName: carrier.carrierName,
        chargeSide: load.chargeSide,
      })
      .from(paymentOrder)
      .innerJoin(load, eq(load.id, paymentOrder.loadId))
      .innerJoin(branch, eq(branch.id, paymentOrder.branchId))
      .leftJoin(carrier, eq(carrier.id, paymentOrder.carrierId))
      .where(whereClause)
      .orderBy(paymentOrder.createdAt)
      .limit(input.limit)
      .offset(offset),
    db.select({ value: count() }).from(paymentOrder).where(whereClause),
  ]);

  const invoicesMap = await fetchInvoicesForPaymentOrders(rows.map((r) => r.paymentOrder.id));

  return {
    paymentOrders: rows.map((r) =>
      mapRow(
        r.paymentOrder,
        r.referenceNumber,
        r.branchName,
        r.carrierName ?? null,
        r.chargeSide ?? null,
        invoicesMap.get(r.paymentOrder.id) ?? [],
      ),
    ),
    total: Number(totalRows[0]?.value ?? 0),
  };
};

export interface UpdatePaymentOrderInput {
  paymentStatus?: PaymentStatus;
  carrierPaidAmount?: number | null;
  carrierPaidDate?: string | null;
  brokerReceivedAmount?: number | null;
  brokerReceivedDate?: string | null;
}

export const updatePaymentOrder = async (
  paymentOrderId: string,
  input: UpdatePaymentOrderInput,
): Promise<boolean> => {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.paymentStatus !== undefined) set.paymentStatus = input.paymentStatus;
  if (input.carrierPaidAmount !== undefined)
    set.carrierPaidAmount = input.carrierPaidAmount?.toString() ?? null;
  if (input.carrierPaidDate !== undefined) set.carrierPaidDate = input.carrierPaidDate ?? null;
  if (input.brokerReceivedAmount !== undefined)
    set.brokerReceivedAmount = input.brokerReceivedAmount?.toString() ?? null;
  if (input.brokerReceivedDate !== undefined)
    set.brokerReceivedDate = input.brokerReceivedDate ?? null;

  const result = await db
    .update(paymentOrder)
    .set(set)
    .where(eq(paymentOrder.id, paymentOrderId))
    .returning({ id: paymentOrder.id });

  return result.length > 0;
};

export const addPaymentOrderInvoice = async (
  paymentOrderId: string,
  fileId: string,
): Promise<void> => {
  await db.insert(paymentOrderFiles).values({ paymentOrderId, fileId }).onConflictDoNothing();
};

export const removePaymentOrderInvoice = async (
  paymentOrderId: string,
  fileId: string,
): Promise<boolean> => {
  const result = await db
    .delete(paymentOrderFiles)
    .where(
      and(
        eq(paymentOrderFiles.paymentOrderId, paymentOrderId),
        eq(paymentOrderFiles.fileId, fileId),
      ),
    )
    .returning({ fileId: paymentOrderFiles.fileId });

  return result.length > 0;
};
