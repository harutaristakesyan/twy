import { branch, carrier, db, file, load, paymentOrder, paymentOrderFiles } from "@twy/db";
import { avg, count, eq, inArray, sql, sum } from "drizzle-orm";
import type { PaymentOrderInvoice } from "../payment-order/response.js";
import type {
  ExternalBillingBranch,
  ExternalBillingLoad,
  InternalBillingBranch,
  InternalBillingLoad,
} from "./response.js";

const numericToNumber = (value: string | null | undefined): number | null =>
  value == null ? null : Number(value);

const numericToNumberOrZero = (value: string | null | undefined): number =>
  value == null ? 0 : Number(value);

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

// ---------------------------------------------------------------------------
// External Billing — broker receivable vs carrier payable per branch
// ---------------------------------------------------------------------------

export const listExternalBillingByBranch = async (
  scopeBranchId?: string,
): Promise<ExternalBillingBranch[]> => {
  const whereClause = scopeBranchId ? eq(paymentOrder.branchId, scopeBranchId) : undefined;

  const rows = await db
    .select({
      branchId: branch.id,
      branchName: branch.name,
      loadCount: count(paymentOrder.id),
      totalBrokerReceivable: sum(paymentOrder.brokerReceivable),
      totalBrokerReceived: sum(paymentOrder.brokerReceivedAmount),
      totalCarrierPayable: sum(paymentOrder.carrierPayable),
      totalCarrierPaid: sum(paymentOrder.carrierPaidAmount),
    })
    .from(paymentOrder)
    .innerJoin(branch, eq(branch.id, paymentOrder.branchId))
    .where(whereClause)
    .groupBy(branch.id, branch.name)
    .orderBy(branch.name);

  return rows.map((r) => {
    const totalCarrierPayable = numericToNumberOrZero(r.totalCarrierPayable);
    const totalCarrierPaid = numericToNumberOrZero(r.totalCarrierPaid);
    return {
      branchId: r.branchId,
      branchName: r.branchName,
      loadCount: Number(r.loadCount),
      totalBrokerReceivable: numericToNumberOrZero(r.totalBrokerReceivable),
      totalBrokerReceived: numericToNumberOrZero(r.totalBrokerReceived),
      totalCarrierPayable,
      totalCarrierPaid,
      owedToBranch: totalCarrierPayable - totalCarrierPaid,
    };
  });
};

export const listExternalBillingLoadsForBranch = async (
  branchId: string,
): Promise<ExternalBillingLoad[]> => {
  const rows = await db
    .select({
      loadId: paymentOrder.loadId,
      referenceNumber: load.referenceNumber,
      carrierName: carrier.carrierName,
      brokerReceivable: paymentOrder.brokerReceivable,
      brokerReceivedAmount: paymentOrder.brokerReceivedAmount,
      brokerReceivedDate: paymentOrder.brokerReceivedDate,
      carrierPayable: paymentOrder.carrierPayable,
      carrierPaidAmount: paymentOrder.carrierPaidAmount,
      carrierPaidDate: paymentOrder.carrierPaidDate,
      paymentStatus: paymentOrder.paymentStatus,
    })
    .from(paymentOrder)
    .innerJoin(load, eq(load.id, paymentOrder.loadId))
    .leftJoin(carrier, eq(carrier.id, paymentOrder.carrierId))
    .where(eq(paymentOrder.branchId, branchId))
    .orderBy(load.referenceNumber);

  return rows.map((r) => ({
    loadId: r.loadId,
    referenceNumber: r.referenceNumber,
    carrierName: r.carrierName ?? null,
    brokerReceivable: numericToNumber(r.brokerReceivable),
    brokerReceivedAmount: numericToNumber(r.brokerReceivedAmount),
    brokerReceivedDate: r.brokerReceivedDate ?? null,
    carrierPayable: Number(r.carrierPayable),
    carrierPaidAmount: numericToNumber(r.carrierPaidAmount),
    carrierPaidDate: r.carrierPaidDate ?? null,
    paymentStatus: r.paymentStatus,
  }));
};

// ---------------------------------------------------------------------------
// Internal Billing — TWY income per branch
// ---------------------------------------------------------------------------

export const listInternalBillingByBranch = async (
  scopeBranchId?: string,
): Promise<InternalBillingBranch[]> => {
  const whereClause = scopeBranchId ? eq(paymentOrder.branchId, scopeBranchId) : undefined;

  const rows = await db
    .select({
      branchId: branch.id,
      branchName: branch.name,
      loadCount: count(paymentOrder.id),
      totalServiceFee: sum(paymentOrder.serviceFee),
      totalCharges: sum(paymentOrder.charges),
      avgIncomePercentage: avg(paymentOrder.incomePercentage),
      totalProfit: sum(sql`COALESCE(${paymentOrder.profit}, 0)`),
    })
    .from(paymentOrder)
    .innerJoin(branch, eq(branch.id, paymentOrder.branchId))
    .where(whereClause)
    .groupBy(branch.id, branch.name)
    .orderBy(branch.name);

  return rows.map((r) => ({
    branchId: r.branchId,
    branchName: r.branchName,
    loadCount: Number(r.loadCount),
    totalServiceFee: numericToNumberOrZero(r.totalServiceFee),
    totalCharges: numericToNumberOrZero(r.totalCharges),
    avgIncomePercentage: numericToNumber(r.avgIncomePercentage as string | null),
    totalProfit: numericToNumberOrZero(r.totalProfit as string | null),
  }));
};

export const listInternalBillingLoadsForBranch = async (
  branchId: string,
): Promise<InternalBillingLoad[]> => {
  const rows = await db
    .select({
      paymentOrderId: paymentOrder.id,
      loadId: paymentOrder.loadId,
      referenceNumber: load.referenceNumber,
      carrierName: carrier.carrierName,
      serviceFee: paymentOrder.serviceFee,
      incomePercentage: paymentOrder.incomePercentage,
      charges: paymentOrder.charges,
      profit: paymentOrder.profit,
      paymentStatus: paymentOrder.paymentStatus,
    })
    .from(paymentOrder)
    .innerJoin(load, eq(load.id, paymentOrder.loadId))
    .leftJoin(carrier, eq(carrier.id, paymentOrder.carrierId))
    .where(eq(paymentOrder.branchId, branchId))
    .orderBy(load.referenceNumber);

  const invoicesMap = await fetchInvoicesForPaymentOrders(rows.map((r) => r.paymentOrderId));

  return rows.map((r) => ({
    loadId: r.loadId,
    referenceNumber: r.referenceNumber,
    carrierName: r.carrierName ?? null,
    serviceFee: Number(r.serviceFee),
    incomePercentage: numericToNumber(r.incomePercentage),
    charges: numericToNumber(r.charges),
    profit: numericToNumber(r.profit),
    paymentStatus: r.paymentStatus,
    invoices: invoicesMap.get(r.paymentOrderId) ?? [],
  }));
};
