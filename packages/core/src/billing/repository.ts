import { branch, db, invoice, load } from "@twy/db";
import { and, desc, eq, gte, inArray, lte, sql, sum } from "drizzle-orm";
import { calculateProfit } from "./profit.js";

const numericToNumber = (value: string | null): number | null =>
  value === null ? null : Number(value);

export interface ListBillingInput {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface TwyAccountingRow {
  loadId: string;
  referenceNumber: string;
  branchId: string;
  branchName: string;
  carrier: string | null;
  customerRate: number | null;
  carrierRate: number;
  serviceFee: number | null;
  incomePercentage: number | null;
  charges: number | null;
  profit: number | null;
  status: string;
  carrierInvoice: {
    id: string;
    type: "carrier";
    loadId: string;
    amount: number;
    dueAt: string;
    status: string;
  } | null;
  brokerInvoice: {
    id: string;
    type: "broker";
    loadId: string;
    amount: number;
    dueAt: string;
    status: string;
  } | null;
}

export interface ExternalBillingRow {
  branchId: string;
  branchName: string;
  totalReceivable: number;
  totalPayable: number;
  balance: number;
}

export interface InternalBillingRow {
  loadId: string;
  referenceNumber: string;
  branchId: string;
  branchName: string;
  serviceFee: number | null;
  incomePercentage: number | null;
  charges: number | null;
  profit: number | null;
}

const buildDateFilter = (dateFrom?: string, dateTo?: string) => {
  const filters = [];
  if (dateFrom) filters.push(gte(load.createdAt, new Date(dateFrom)));
  if (dateTo) filters.push(lte(load.createdAt, new Date(dateTo)));
  return filters;
};

export const getTwyAccountingRows = async (
  input: ListBillingInput,
): Promise<{ rows: TwyAccountingRow[]; total: number }> => {
  const page = input.page ?? 0;
  const limit = input.limit ?? 20;
  const offset = page * limit;

  const filters = [
    ...(input.branchId ? [eq(load.branchId, input.branchId)] : []),
    ...buildDateFilter(input.dateFrom, input.dateTo),
  ];

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const loadRows = await db
    .select({
      id: load.id,
      referenceNumber: load.referenceNumber,
      branchId: load.branchId,
      branchName: branch.name,
      carrier: load.carrier,
      customerRate: load.customerRate,
      carrierRate: load.carrierRate,
      serviceFee: load.serviceFee,
      incomePercentage: load.incomePercentage,
      charges: load.charges,
      status: load.status,
    })
    .from(load)
    .innerJoin(branch, eq(branch.id, load.branchId))
    .where(whereClause)
    .orderBy(desc(load.createdAt))
    .limit(limit)
    .offset(offset);

  const totalRows = await db.select({ value: sql<number>`count(*)` }).from(load).where(whereClause);

  if (loadRows.length === 0) {
    return { rows: [], total: Number(totalRows[0]?.value ?? 0) };
  }

  const loadIds = loadRows.map((r) => r.id);

  const invoiceRows = await db.select().from(invoice).where(inArray(invoice.loadId, loadIds));

  const invoicesByLoad = new Map<
    string,
    { carrier: (typeof invoiceRows)[0] | null; broker: (typeof invoiceRows)[0] | null }
  >();
  for (const inv of invoiceRows) {
    const entry = invoicesByLoad.get(inv.loadId) ?? { carrier: null, broker: null };
    if (inv.type === "carrier") entry.carrier = inv;
    if (inv.type === "broker") entry.broker = inv;
    invoicesByLoad.set(inv.loadId, entry);
  }

  const rows: TwyAccountingRow[] = loadRows.map((row) => {
    const invs = invoicesByLoad.get(row.id) ?? { carrier: null, broker: null };
    const profit = calculateProfit({
      serviceFee: numericToNumber(row.serviceFee),
      incomePercentage: numericToNumber(row.incomePercentage),
      customerRate: numericToNumber(row.customerRate),
      charges: numericToNumber(row.charges),
    });

    return {
      loadId: row.id,
      referenceNumber: row.referenceNumber,
      branchId: row.branchId,
      branchName: row.branchName,
      carrier: row.carrier ?? null,
      customerRate: numericToNumber(row.customerRate),
      carrierRate: Number(row.carrierRate),
      serviceFee: numericToNumber(row.serviceFee),
      incomePercentage: numericToNumber(row.incomePercentage),
      charges: numericToNumber(row.charges),
      profit: profit.total,
      status: row.status,
      carrierInvoice: invs.carrier
        ? {
            id: invs.carrier.id,
            type: "carrier" as const,
            loadId: row.id,
            amount: Number(invs.carrier.amount),
            dueAt: invs.carrier.dueAt.toISOString(),
            status: invs.carrier.status,
          }
        : null,
      brokerInvoice: invs.broker
        ? {
            id: invs.broker.id,
            type: "broker" as const,
            loadId: row.id,
            amount: Number(invs.broker.amount),
            dueAt: invs.broker.dueAt.toISOString(),
            status: invs.broker.status,
          }
        : null,
    };
  });

  return { rows, total: Number(totalRows[0]?.value ?? 0) };
};

export const getExternalBillingByBranch = async (
  input: ListBillingInput,
): Promise<ExternalBillingRow[]> => {
  const filters = [
    ...(input.branchId ? [eq(load.branchId, input.branchId)] : []),
    ...buildDateFilter(input.dateFrom, input.dateTo),
  ];

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const rows = await db
    .select({
      branchId: load.branchId,
      branchName: branch.name,
      totalReceivable: sum(
        sql<string>`case when ${invoice.type} = 'broker' then ${invoice.amount}::numeric else 0 end`,
      ),
      totalPayable: sum(
        sql<string>`case when ${invoice.type} = 'carrier' then ${invoice.amount}::numeric else 0 end`,
      ),
    })
    .from(load)
    .innerJoin(branch, eq(branch.id, load.branchId))
    .leftJoin(invoice, eq(invoice.loadId, load.id))
    .where(whereClause)
    .groupBy(load.branchId, branch.name);

  return rows.map((r) => {
    const totalReceivable = Number(r.totalReceivable ?? 0);
    const totalPayable = Number(r.totalPayable ?? 0);
    return {
      branchId: r.branchId,
      branchName: r.branchName,
      totalReceivable,
      totalPayable,
      balance: totalReceivable - totalPayable,
    };
  });
};

export const getInternalBillingByBranch = async (
  input: ListBillingInput,
): Promise<{ rows: InternalBillingRow[]; total: number }> => {
  const page = input.page ?? 0;
  const limit = input.limit ?? 20;
  const offset = page * limit;

  const filters = [
    ...(input.branchId ? [eq(load.branchId, input.branchId)] : []),
    ...buildDateFilter(input.dateFrom, input.dateTo),
  ];

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const loadRows = await db
    .select({
      id: load.id,
      referenceNumber: load.referenceNumber,
      branchId: load.branchId,
      branchName: branch.name,
      serviceFee: load.serviceFee,
      incomePercentage: load.incomePercentage,
      customerRate: load.customerRate,
      charges: load.charges,
    })
    .from(load)
    .innerJoin(branch, eq(branch.id, load.branchId))
    .where(whereClause)
    .orderBy(desc(load.createdAt))
    .limit(limit)
    .offset(offset);

  const totalRows = await db.select({ value: sql<number>`count(*)` }).from(load).where(whereClause);

  const rows: InternalBillingRow[] = loadRows.map((row) => {
    const profit = calculateProfit({
      serviceFee: numericToNumber(row.serviceFee),
      incomePercentage: numericToNumber(row.incomePercentage),
      customerRate: numericToNumber(row.customerRate),
      charges: numericToNumber(row.charges),
    });
    return {
      loadId: row.id,
      referenceNumber: row.referenceNumber,
      branchId: row.branchId,
      branchName: row.branchName,
      serviceFee: numericToNumber(row.serviceFee),
      incomePercentage: numericToNumber(row.incomePercentage),
      charges: numericToNumber(row.charges),
      profit: profit.total,
    };
  });

  return { rows, total: Number(totalRows[0]?.value ?? 0) };
};
