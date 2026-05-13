import { randomUUID } from "node:crypto";
import {
  type Currency,
  db,
  file,
  loadFiles,
  type OfficeExpensePaymentStatus,
  type OfficeExpenseService,
  officeExpensePaymentOrder,
  officeExpensePaymentOrderFiles,
  paymentOrderFiles,
} from "@twy/db";
import type { SQL } from "drizzle-orm";
import { and, count, eq, gte, ilike, inArray, lte, ne } from "drizzle-orm";
import createError from "http-errors";
import { deleteFile as deleteFileObjectFromS3 } from "../file/service.js";
import type { AdvancedFilter } from "../shared/advanced-filter-schema.js";
import type { OfficeExpenseFile, OfficeExpensePaymentOrderResponse } from "./response.js";

const mapRow = (
  row: typeof officeExpensePaymentOrder.$inferSelect,
  files: OfficeExpenseFile[],
): OfficeExpensePaymentOrderResponse => ({
  id: row.id,
  serviceName: row.serviceName as OfficeExpenseService,
  paymentPurpose: row.paymentPurpose,
  periodStart: row.periodStart,
  periodEnd: row.periodEnd,
  amount: Number(row.amount),
  currency: row.currency as Currency,
  paymentStatus: row.paymentStatus as OfficeExpensePaymentStatus,
  paymentMadeOn: row.paymentMadeOn ?? null,
  createdBy: row.createdBy,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  files,
});

const fetchFilesForOrders = async (
  orderIds: string[],
): Promise<Map<string, OfficeExpenseFile[]>> => {
  if (orderIds.length === 0) return new Map();
  const rows = await db
    .select({
      orderId: officeExpensePaymentOrderFiles.officeExpensePaymentOrderId,
      fileId: officeExpensePaymentOrderFiles.fileId,
      fileName: file.fileName,
    })
    .from(officeExpensePaymentOrderFiles)
    .innerJoin(file, eq(file.id, officeExpensePaymentOrderFiles.fileId))
    .where(inArray(officeExpensePaymentOrderFiles.officeExpensePaymentOrderId, orderIds));

  const map = new Map<string, OfficeExpenseFile[]>();
  for (const row of rows) {
    if (!map.has(row.orderId)) map.set(row.orderId, []);
    map.get(row.orderId)?.push({ fileId: row.fileId, fileName: row.fileName });
  }
  return map;
};

export interface CreateOfficeExpenseInput {
  serviceName: OfficeExpenseService;
  paymentPurpose: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  currency: Currency;
  createdBy: string;
}

export const createOfficeExpensePaymentOrder = async (
  input: CreateOfficeExpenseInput,
): Promise<OfficeExpensePaymentOrderResponse> => {
  const [row] = await db
    .insert(officeExpensePaymentOrder)
    .values({
      id: randomUUID(),
      serviceName: input.serviceName,
      paymentPurpose: input.paymentPurpose,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      amount: input.amount.toString(),
      currency: input.currency,
      createdBy: input.createdBy,
    })
    .returning();

  return mapRow(row, []);
};

function buildOfficeExpenseFilterConditions(filter: AdvancedFilter): SQL<unknown>[] {
  const conds: SQL<unknown>[] = [];
  if (filter.serviceName)
    conds.push(
      eq(officeExpensePaymentOrder.serviceName, filter.serviceName as OfficeExpenseService),
    );
  if (filter.paymentStatus)
    conds.push(
      eq(
        officeExpensePaymentOrder.paymentStatus,
        filter.paymentStatus as OfficeExpensePaymentStatus,
      ),
    );
  // Overlap semantics: period overlaps [dateFrom, dateTo] ⟺ periodStart ≤ dateTo AND periodEnd ≥ dateFrom
  if (filter.dateFrom) conds.push(gte(officeExpensePaymentOrder.periodEnd, filter.dateFrom));
  if (filter.dateTo) conds.push(lte(officeExpensePaymentOrder.periodStart, filter.dateTo));
  return conds;
}

export interface ListOfficeExpensesInput {
  page: number;
  limit: number;
  query?: string;
  advancedFilter?: AdvancedFilter;
  ownerId?: string;
}

export const listOfficeExpensePaymentOrders = async (
  input: ListOfficeExpensesInput,
): Promise<{ orders: OfficeExpensePaymentOrderResponse[]; total: number }> => {
  const offset = input.page * input.limit;

  const filterConds = input.advancedFilter
    ? buildOfficeExpenseFilterConditions(input.advancedFilter)
    : [];
  const queryCond = input.query
    ? ilike(officeExpensePaymentOrder.paymentPurpose, `%${input.query}%`)
    : undefined;
  const ownerCond = input.ownerId
    ? eq(officeExpensePaymentOrder.createdBy, input.ownerId)
    : undefined;

  const whereClause = and(queryCond, ownerCond, ...filterConds);

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(officeExpensePaymentOrder)
      .where(whereClause)
      .orderBy(officeExpensePaymentOrder.createdAt)
      .limit(input.limit)
      .offset(offset),
    db.select({ value: count() }).from(officeExpensePaymentOrder).where(whereClause),
  ]);

  const filesMap = await fetchFilesForOrders(rows.map((r) => r.id));

  return {
    orders: rows.map((r) => mapRow(r, filesMap.get(r.id) ?? [])),
    total: Number(totalRows[0]?.value ?? 0),
  };
};

export const getOfficeExpensePaymentOrder = async (
  id: string,
): Promise<OfficeExpensePaymentOrderResponse | null> => {
  const [row] = await db
    .select()
    .from(officeExpensePaymentOrder)
    .where(eq(officeExpensePaymentOrder.id, id));

  if (!row) return null;

  const filesMap = await fetchFilesForOrders([id]);
  return mapRow(row, filesMap.get(id) ?? []);
};

export interface UpdateOfficeExpenseInput {
  serviceName?: OfficeExpenseService;
  paymentPurpose?: string;
  periodStart?: string;
  periodEnd?: string;
  amount?: number;
  currency?: Currency;
  paymentStatus?: OfficeExpensePaymentStatus;
  paymentMadeOn?: string | null;
}

export const updateOfficeExpensePaymentOrder = async (
  id: string,
  input: UpdateOfficeExpenseInput,
): Promise<boolean> => {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.serviceName !== undefined) set.serviceName = input.serviceName;
  if (input.paymentPurpose !== undefined) set.paymentPurpose = input.paymentPurpose;
  if (input.periodStart !== undefined) set.periodStart = input.periodStart;
  if (input.periodEnd !== undefined) set.periodEnd = input.periodEnd;
  if (input.amount !== undefined) set.amount = input.amount.toString();
  if (input.currency !== undefined) set.currency = input.currency;
  if (input.paymentStatus !== undefined) {
    set.paymentStatus = input.paymentStatus;
    if (input.paymentStatus === "Paid" && input.paymentMadeOn === undefined) {
      set.paymentMadeOn = new Date().toISOString().slice(0, 10);
    } else if (input.paymentStatus !== "Paid" && input.paymentMadeOn === undefined) {
      set.paymentMadeOn = null;
    }
  }
  if (input.paymentMadeOn !== undefined) set.paymentMadeOn = input.paymentMadeOn ?? null;

  const result = await db
    .update(officeExpensePaymentOrder)
    .set(set)
    .where(eq(officeExpensePaymentOrder.id, id))
    .returning({ id: officeExpensePaymentOrder.id });

  return result.length > 0;
};

export interface AddOfficeExpenseFileAuth {
  actorUserId: string;
  orderCreatedBy: string;
}

const countGlobalFileReferences = async (fileId: string): Promise<number> => {
  const [loadRefs, paymentRefs, officeExpenseRefs] = await Promise.all([
    db.select({ c: count() }).from(loadFiles).where(eq(loadFiles.fileId, fileId)),
    db.select({ c: count() }).from(paymentOrderFiles).where(eq(paymentOrderFiles.fileId, fileId)),
    db
      .select({ c: count() })
      .from(officeExpensePaymentOrderFiles)
      .where(eq(officeExpensePaymentOrderFiles.fileId, fileId)),
  ]);
  return (
    Number(loadRefs[0]?.c ?? 0) +
    Number(paymentRefs[0]?.c ?? 0) +
    Number(officeExpenseRefs[0]?.c ?? 0)
  );
};

export const addOfficeExpenseFile = async (
  orderId: string,
  fileId: string,
  auth: AddOfficeExpenseFileAuth,
): Promise<void> => {
  const [fileRow] = await db.select().from(file).where(eq(file.id, fileId));
  if (!fileRow) {
    throw createError(404, "File not found");
  }
  if (!fileRow.createdBy) {
    throw createError(403, "File cannot be linked without an upload owner");
  }
  const ownerOk =
    fileRow.createdBy === auth.actorUserId || fileRow.createdBy === auth.orderCreatedBy;
  if (!ownerOk) {
    throw createError(403, "File cannot be linked to this order");
  }

  const [loadRef] = await db
    .select({ c: count() })
    .from(loadFiles)
    .where(eq(loadFiles.fileId, fileId));
  if (Number(loadRef?.c ?? 0) > 0) {
    throw createError(403, "File is already attached to a load");
  }

  const [paymentRef] = await db
    .select({ c: count() })
    .from(paymentOrderFiles)
    .where(eq(paymentOrderFiles.fileId, fileId));
  if (Number(paymentRef?.c ?? 0) > 0) {
    throw createError(403, "File is already attached to a payment order");
  }

  const [otherOfficeExpenseRef] = await db
    .select({ c: count() })
    .from(officeExpensePaymentOrderFiles)
    .where(
      and(
        eq(officeExpensePaymentOrderFiles.fileId, fileId),
        ne(officeExpensePaymentOrderFiles.officeExpensePaymentOrderId, orderId),
      ),
    );
  if (Number(otherOfficeExpenseRef?.c ?? 0) > 0) {
    throw createError(403, "File is already attached to another office expense order");
  }

  await db
    .insert(officeExpensePaymentOrderFiles)
    .values({ officeExpensePaymentOrderId: orderId, fileId })
    .onConflictDoNothing();
};

export const removeOfficeExpenseFile = async (id: string, fileId: string): Promise<boolean> => {
  const joinResult = await db
    .delete(officeExpensePaymentOrderFiles)
    .where(
      and(
        eq(officeExpensePaymentOrderFiles.officeExpensePaymentOrderId, id),
        eq(officeExpensePaymentOrderFiles.fileId, fileId),
      ),
    )
    .returning({ fileId: officeExpensePaymentOrderFiles.fileId });

  if (joinResult.length === 0) return false;

  const refCount = await countGlobalFileReferences(fileId);
  if (refCount === 0) {
    try {
      await db.delete(file).where(eq(file.id, fileId));
    } catch {
      return true;
    }
    try {
      await deleteFileObjectFromS3(fileId);
    } catch {
      /* Row is gone; orphan S3 object is acceptable vs. failing the unlink response. */
    }
  }

  return true;
};
