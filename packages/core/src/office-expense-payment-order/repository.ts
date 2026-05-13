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
import { MAX_FILE_IDS_PER_OFFICE_EXPENSE_CREATE } from "./constants.js";
import type { OfficeExpenseFile, OfficeExpensePaymentOrderResponse } from "./response.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

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
  /** Optional file IDs to attach in the same transaction as insert (same rules as add-file). */
  fileIds?: string[];
}

export const createOfficeExpensePaymentOrder = async (
  input: CreateOfficeExpenseInput,
): Promise<OfficeExpensePaymentOrderResponse> => {
  const uniqueFileIds =
    input.fileIds && input.fileIds.length > 0 ? [...new Set(input.fileIds)] : [];
  if (uniqueFileIds.length > MAX_FILE_IDS_PER_OFFICE_EXPENSE_CREATE) {
    throw createError(400, `At most ${MAX_FILE_IDS_PER_OFFICE_EXPENSE_CREATE} files per order`);
  }
  const orderId = randomUUID();
  const linkAuth: AddOfficeExpenseFileAuth = {
    actorUserId: input.createdBy,
    orderCreatedBy: input.createdBy,
  };

  const { inserted, linkedFiles } = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(officeExpensePaymentOrder)
      .values({
        id: orderId,
        serviceName: input.serviceName,
        paymentPurpose: input.paymentPurpose,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        amount: input.amount.toString(),
        currency: input.currency,
        createdBy: input.createdBy,
      })
      .returning();

    const linkedFiles =
      uniqueFileIds.length > 0
        ? await linkOfficeExpenseFilesToOrder(tx, orderId, uniqueFileIds, linkAuth)
        : [];

    return { inserted, linkedFiles };
  });

  return mapRow(inserted, linkedFiles);
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
  const [existing] = await db
    .select({
      id: officeExpensePaymentOrder.id,
      paymentStatus: officeExpensePaymentOrder.paymentStatus,
      paymentMadeOn: officeExpensePaymentOrder.paymentMadeOn,
    })
    .from(officeExpensePaymentOrder)
    .where(eq(officeExpensePaymentOrder.id, id));

  if (!existing) return false;

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.serviceName !== undefined) set.serviceName = input.serviceName;
  if (input.paymentPurpose !== undefined) set.paymentPurpose = input.paymentPurpose;
  if (input.periodStart !== undefined) set.periodStart = input.periodStart;
  if (input.periodEnd !== undefined) set.periodEnd = input.periodEnd;
  if (input.amount !== undefined) set.amount = input.amount.toString();
  if (input.currency !== undefined) set.currency = input.currency;
  if (input.paymentStatus !== undefined) {
    set.paymentStatus = input.paymentStatus;
    if (input.paymentMadeOn === undefined) {
      if (input.paymentStatus === "Paid" && existing.paymentStatus !== "Paid") {
        set.paymentMadeOn = new Date().toISOString().slice(0, 10);
      } else if (input.paymentStatus !== "Paid" && existing.paymentStatus === "Paid") {
        set.paymentMadeOn = null;
      }
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
  /** User performing the link (must match file upload owner unless order creator uploaded). */
  actorUserId: string;
  /** Office expense order `createdBy` — used when linking files uploaded by the order owner. */
  orderCreatedBy: string;
}

/** Validates and links one or more files in one round-trip (batch insert). */
const linkOfficeExpenseFilesToOrder = async (
  executor: Executor,
  orderId: string,
  fileIds: string[],
  auth: AddOfficeExpenseFileAuth,
): Promise<OfficeExpenseFile[]> => {
  if (fileIds.length === 0) return [];

  const fileRows = await executor.select().from(file).where(inArray(file.id, fileIds));
  if (fileRows.length !== fileIds.length) {
    throw createError(404, "File not found");
  }

  for (const fileRow of fileRows) {
    if (!fileRow.createdBy) {
      throw createError(403, "File cannot be linked without an upload owner");
    }
    const ownerOk =
      fileRow.createdBy === auth.actorUserId || fileRow.createdBy === auth.orderCreatedBy;
    if (!ownerOk) {
      throw createError(403, "File cannot be linked to this order");
    }
  }

  const [loadHit] = await executor
    .select({ c: count() })
    .from(loadFiles)
    .where(inArray(loadFiles.fileId, fileIds));
  if (Number(loadHit?.c ?? 0) > 0) {
    throw createError(403, "File is already attached to a load");
  }

  const [paymentHit] = await executor
    .select({ c: count() })
    .from(paymentOrderFiles)
    .where(inArray(paymentOrderFiles.fileId, fileIds));
  if (Number(paymentHit?.c ?? 0) > 0) {
    throw createError(403, "File is already attached to a payment order");
  }

  const [otherOeHit] = await executor
    .select({ c: count() })
    .from(officeExpensePaymentOrderFiles)
    .where(
      and(
        inArray(officeExpensePaymentOrderFiles.fileId, fileIds),
        ne(officeExpensePaymentOrderFiles.officeExpensePaymentOrderId, orderId),
      ),
    );
  if (Number(otherOeHit?.c ?? 0) > 0) {
    throw createError(403, "File is already attached to another office expense order");
  }

  await executor
    .insert(officeExpensePaymentOrderFiles)
    .values(fileIds.map((fid) => ({ officeExpensePaymentOrderId: orderId, fileId: fid })))
    .onConflictDoNothing();

  return fileRows.map((r) => ({ fileId: r.id, fileName: r.fileName }));
};

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
  await linkOfficeExpenseFilesToOrder(db, orderId, [fileId], auth);
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
