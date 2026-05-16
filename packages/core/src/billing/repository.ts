import {
  branch,
  carrier,
  db,
  file,
  load,
  outsideBroker,
  type PaymentStatus,
  paymentOrder,
  paymentOrderFiles,
  users,
} from "@twy/db";
import type { SQL } from "drizzle-orm";
import { and, avg, count, eq, ilike, inArray, sql, sum } from "drizzle-orm";
import type { PaymentOrderInvoice } from "../payment-order/response.js";
import type { AdvancedFilter } from "../shared/advanced-filter-schema.js";
import { buildDateRangeCondition } from "../shared/advanced-filter-sql.js";
import { formatUserName } from "../shared/formatters.js";
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

function buildFilterConditions(filter: AdvancedFilter, scopeBranchId?: string): SQL<unknown>[] {
  const conds: SQL<unknown>[] = [];

  const branchId = filter.branchId ?? scopeBranchId;
  if (branchId) conds.push(eq(paymentOrder.branchId, branchId));

  if (filter.carrierId) conds.push(eq(paymentOrder.carrierId, filter.carrierId));

  if (filter.status) {
    const statuses = filter.status.split(",").filter(Boolean) as PaymentStatus[];
    if (statuses.length > 0) conds.push(inArray(paymentOrder.paymentStatus, statuses));
  }

  const dateCond = buildDateRangeCondition(filter, "createdAt", paymentOrder.createdAt);
  if (dateCond) conds.push(dateCond);

  if (filter.broker) conds.push(ilike(outsideBroker.brokerName, `%${filter.broker}%`));

  return conds;
}

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
  query?: string,
  advancedFilter?: AdvancedFilter,
): Promise<ExternalBillingBranch[]> => {
  const filterConds = advancedFilter
    ? buildFilterConditions(advancedFilter, scopeBranchId)
    : scopeBranchId
      ? [eq(paymentOrder.branchId, scopeBranchId)]
      : [];

  const queryCond = query ? ilike(load.referenceNumber, `%${query}%`) : undefined;
  const whereClause = and(...filterConds, queryCond);

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
    .innerJoin(load, eq(load.id, paymentOrder.loadId))
    .innerJoin(branch, eq(branch.id, paymentOrder.branchId))
    .innerJoin(outsideBroker, eq(outsideBroker.id, load.brokerId))
    .leftJoin(carrier, eq(carrier.id, paymentOrder.carrierId))
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
  query?: string,
  advancedFilter?: AdvancedFilter,
): Promise<ExternalBillingLoad[]> => {
  const filterConds = advancedFilter ? buildFilterConditions(advancedFilter) : [];
  const queryCond = query ? ilike(load.referenceNumber, `%${query}%`) : undefined;
  const whereClause = and(eq(paymentOrder.branchId, branchId), ...filterConds, queryCond);

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
      createdByUserId: load.createdBy,
      createdByFirstName: users.firstName,
      createdByLastName: users.lastName,
      createdByEmail: users.email,
    })
    .from(paymentOrder)
    .innerJoin(load, eq(load.id, paymentOrder.loadId))
    .innerJoin(outsideBroker, eq(outsideBroker.id, load.brokerId))
    .leftJoin(carrier, eq(carrier.id, paymentOrder.carrierId))
    .leftJoin(users, eq(users.id, load.createdBy))
    .where(whereClause)
    .orderBy(load.referenceNumber);

  return rows.map((r) => {
    const createdByUserName = r.createdByUserId
      ? formatUserName(r.createdByFirstName, r.createdByLastName, r.createdByEmail)
      : null;
    return {
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
      createdByUserId: r.createdByUserId ?? null,
      createdByUserName,
    };
  });
};

// ---------------------------------------------------------------------------
// Internal Billing — TWY income per branch
// ---------------------------------------------------------------------------

export const listInternalBillingByBranch = async (
  scopeBranchId?: string,
  query?: string,
  advancedFilter?: AdvancedFilter,
): Promise<InternalBillingBranch[]> => {
  const filterConds = advancedFilter
    ? buildFilterConditions(advancedFilter, scopeBranchId)
    : scopeBranchId
      ? [eq(paymentOrder.branchId, scopeBranchId)]
      : [];

  const queryCond = query ? ilike(load.referenceNumber, `%${query}%`) : undefined;
  const whereClause = and(...filterConds, queryCond);

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
    .innerJoin(load, eq(load.id, paymentOrder.loadId))
    .innerJoin(branch, eq(branch.id, paymentOrder.branchId))
    .innerJoin(outsideBroker, eq(outsideBroker.id, load.brokerId))
    .leftJoin(carrier, eq(carrier.id, paymentOrder.carrierId))
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
  query?: string,
  advancedFilter?: AdvancedFilter,
): Promise<InternalBillingLoad[]> => {
  const filterConds = advancedFilter ? buildFilterConditions(advancedFilter) : [];
  const queryCond = query ? ilike(load.referenceNumber, `%${query}%`) : undefined;
  const whereClause = and(eq(paymentOrder.branchId, branchId), ...filterConds, queryCond);

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
    .innerJoin(outsideBroker, eq(outsideBroker.id, load.brokerId))
    .leftJoin(carrier, eq(carrier.id, paymentOrder.carrierId))
    .where(whereClause)
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
