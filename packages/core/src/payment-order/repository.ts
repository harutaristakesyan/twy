import { randomUUID } from "node:crypto";
import {
  branch,
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

export const computePaymentOrderFinancials = (financials: {
  customerRate: string | null;
  carrierRate: string;
  serviceFee: string | null;
}): {
  brokerReceivable: string | null;
  carrierPayable: string;
  incomePercentage: string | null;
  profit: string | null;
} => {
  const customerRate = financials.customerRate != null ? Number(financials.customerRate) : null;
  const carrierRate = Number(financials.carrierRate);
  const serviceFee = financials.serviceFee != null ? Number(financials.serviceFee) : 30;
  const income = customerRate != null ? customerRate - carrierRate : null;
  const incomePercentage =
    income != null && customerRate != null && customerRate !== 0
      ? (income / customerRate) * 100
      : null;
  const profit = income != null ? income + serviceFee : null;

  return {
    brokerReceivable: customerRate != null ? customerRate.toString() : null,
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

export const createPaymentOrderForLoad = async (
  tx: Tx,
  loadId: string,
  userId: string,
): Promise<void> => {
  const [loadRow] = await tx
    .select({
      branchId: load.branchId,
      carrierId: load.carrierId,
      customerRate: load.customerRate,
      carrierRate: load.carrierRate,
      serviceFee: load.serviceFee,
      chargeAmount: load.chargeAmount,
    })
    .from(load)
    .where(eq(load.id, loadId));

  if (!loadRow) return;

  const customerRate = numericToNumber(loadRow.customerRate);
  const carrierRate = Number(loadRow.carrierRate);
  const serviceFee = numericToNumber(loadRow.serviceFee) ?? 30;
  const income = customerRate != null ? customerRate - carrierRate : null;
  const incomePercentage =
    income != null && customerRate != null && customerRate !== 0
      ? (income / customerRate) * 100
      : null;
  const profit = income != null ? income + serviceFee : null;

  await tx
    .insert(paymentOrder)
    .values({
      id: randomUUID(),
      loadId,
      branchId: loadRow.branchId,
      carrierId: loadRow.carrierId ?? null,
      brokerReceivable: customerRate != null ? customerRate.toString() : null,
      carrierPayable: carrierRate.toString(),
      serviceFee: serviceFee.toString(),
      incomePercentage: incomePercentage != null ? incomePercentage.toFixed(2) : null,
      charges: loadRow.chargeAmount ?? null,
      profit: profit != null ? profit.toString() : null,
      createdBy: userId,
    })
    .onConflictDoNothing({ target: paymentOrder.loadId });
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
): Promise<void> => {
  const targetStatus = getPaymentStatusForLoadStatus(toStatus);
  if (!targetStatus) return;

  const [existing] = await tx
    .select({ id: paymentOrder.id })
    .from(paymentOrder)
    .where(eq(paymentOrder.loadId, loadId));

  if (!existing) return;

  await tx
    .update(paymentOrder)
    .set({ paymentStatus: targetStatus, updatedAt: new Date() })
    .where(eq(paymentOrder.id, existing.id));
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
