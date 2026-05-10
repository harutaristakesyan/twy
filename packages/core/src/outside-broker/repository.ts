import { randomUUID } from "node:crypto";
import type { BrokerStatus } from "@twy/db";
import { db, type OrderDirection, outsideBroker } from "@twy/db";
import type { SQL } from "drizzle-orm";
import { and, asc, count, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import createError from "http-errors";
import type { AdvancedFilter } from "../shared/advanced-filter-schema.js";

export interface OutsideBrokerRecord {
  id: string;
  brokerName: string;
  mcNumber: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  status: BrokerStatus;
  creditLimitUnlimited: boolean;
  creditLimit: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListBrokersInput {
  page: number;
  limit: number;
  sortField: "brokerName" | "mcNumber" | "createdAt";
  sortOrder: OrderDirection;
  query?: string;
  advancedFilter?: AdvancedFilter;
}

export interface NewBrokerInput {
  brokerName: string;
  mcNumber: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  status?: string;
  creditLimitUnlimited: boolean;
  creditLimit?: number | null;
  createdBy: string;
}

export interface UpdateBrokerInput {
  brokerName?: string;
  mcNumber?: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  status?: string;
  creditLimitUnlimited?: boolean;
  creditLimit?: number | null;
}

const buildOutsideBrokerAdvancedClause = (
  filter: AdvancedFilter | undefined,
): SQL<unknown> | undefined => {
  if (!filter) return undefined;
  const conds: SQL<unknown>[] = [];
  if (filter.status) conds.push(eq(outsideBroker.status, filter.status as BrokerStatus));
  if (filter.creditLimitUnlimited !== undefined)
    conds.push(eq(outsideBroker.creditLimitUnlimited, filter.creditLimitUnlimited === "true"));
  if (filter.creditLimit__gte !== undefined)
    conds.push(gte(outsideBroker.creditLimit, filter.creditLimit__gte));
  if (filter.creditLimit__lte !== undefined)
    conds.push(lte(outsideBroker.creditLimit, filter.creditLimit__lte));
  if (conds.length === 0) return undefined;
  return and(...conds);
};

const sortColumn = (field: ListBrokersInput["sortField"]) => {
  switch (field) {
    case "brokerName":
      return outsideBroker.brokerName;
    case "mcNumber":
      return outsideBroker.mcNumber;
    default:
      return outsideBroker.createdAt;
  }
};

const mapRow = (row: {
  id: string;
  brokerName: string;
  mcNumber: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  status: BrokerStatus;
  creditLimitUnlimited: boolean;
  creditLimit: string | null;
  createdAt: Date;
  updatedAt: Date;
}): OutsideBrokerRecord => ({
  id: row.id,
  brokerName: row.brokerName,
  mcNumber: row.mcNumber,
  contactName: row.contactName,
  phone: row.phone,
  email: row.email,
  address: row.address,
  notes: row.notes,
  status: row.status,
  creditLimitUnlimited: row.creditLimitUnlimited,
  creditLimit: row.creditLimit !== null ? Number(row.creditLimit) : null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const listBrokers = async (input: ListBrokersInput) => {
  const direction = input.sortOrder === "asc" ? asc : desc;
  const orderCol = sortColumn(input.sortField);
  const offset = input.page * input.limit;

  const searchClause = input.query
    ? or(
        ilike(outsideBroker.brokerName, `%${input.query}%`),
        ilike(outsideBroker.mcNumber, `%${input.query}%`),
      )
    : undefined;

  const approvedOnly = eq(outsideBroker.status, "approved");
  const filterClause = buildOutsideBrokerAdvancedClause(input.advancedFilter);
  const whereClause = and(approvedOnly, searchClause, filterClause);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: outsideBroker.id,
        brokerName: outsideBroker.brokerName,
        mcNumber: outsideBroker.mcNumber,
        contactName: outsideBroker.contactName,
        phone: outsideBroker.phone,
        email: outsideBroker.email,
        address: outsideBroker.address,
        notes: outsideBroker.notes,
        status: outsideBroker.status,
        creditLimitUnlimited: outsideBroker.creditLimitUnlimited,
        creditLimit: outsideBroker.creditLimit,
        createdAt: outsideBroker.createdAt,
        updatedAt: outsideBroker.updatedAt,
      })
      .from(outsideBroker)
      .where(whereClause)
      .orderBy(direction(orderCol))
      .limit(input.limit)
      .offset(offset),
    db.select({ value: count() }).from(outsideBroker).where(whereClause),
  ]);

  return {
    brokers: rows.map(mapRow),
    total: Number(totalRows[0]?.value ?? 0),
  };
};

export const createBroker = async (input: NewBrokerInput): Promise<string> => {
  const id = randomUUID();
  await db.insert(outsideBroker).values({
    id,
    brokerName: input.brokerName,
    mcNumber: input.mcNumber,
    contactName: input.contactName ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    notes: input.notes ?? null,
    status: (input.status ?? "approved") as BrokerStatus,
    creditLimitUnlimited: input.creditLimitUnlimited,
    creditLimit:
      !input.creditLimitUnlimited && input.creditLimit != null
        ? input.creditLimit.toString()
        : null,
    createdBy: input.createdBy,
  });
  return id;
};

export const updateBroker = async (
  brokerId: string,
  input: UpdateBrokerInput,
): Promise<boolean | null> => {
  const [existing] = await db
    .select({ id: outsideBroker.id, status: outsideBroker.status })
    .from(outsideBroker)
    .where(eq(outsideBroker.id, brokerId));

  if (!existing || existing.status !== "approved") {
    return null;
  }

  const payload: Partial<typeof outsideBroker.$inferInsert> = {};

  if (typeof input.brokerName !== "undefined") payload.brokerName = input.brokerName;
  if (typeof input.mcNumber !== "undefined") payload.mcNumber = input.mcNumber;
  if (Object.hasOwn(input, "contactName")) payload.contactName = input.contactName ?? null;
  if (Object.hasOwn(input, "phone")) payload.phone = input.phone ?? null;
  if (Object.hasOwn(input, "email")) payload.email = input.email ?? null;
  if (Object.hasOwn(input, "address")) payload.address = input.address ?? null;
  if (Object.hasOwn(input, "notes")) payload.notes = input.notes ?? null;
  if (typeof input.status !== "undefined") payload.status = input.status as BrokerStatus;

  if (typeof input.creditLimitUnlimited !== "undefined") {
    payload.creditLimitUnlimited = input.creditLimitUnlimited;
    payload.creditLimit =
      !input.creditLimitUnlimited && input.creditLimit != null
        ? input.creditLimit.toString()
        : null;
  } else if (Object.hasOwn(input, "creditLimit")) {
    payload.creditLimit = input.creditLimit != null ? input.creditLimit.toString() : null;
  }

  if (Object.keys(payload).length > 0) {
    await db
      .update(outsideBroker)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(outsideBroker.id, brokerId));
  }

  return true;
};

export const deleteBroker = async (brokerId: string): Promise<boolean> => {
  const [existing] = await db
    .select({ id: outsideBroker.id, status: outsideBroker.status })
    .from(outsideBroker)
    .where(eq(outsideBroker.id, brokerId));

  if (!existing || existing.status !== "approved") {
    return false;
  }

  await db.delete(outsideBroker).where(eq(outsideBroker.id, brokerId));

  return true;
};

export const getBrokerByMcNumber = async (mcNumber: string) => {
  const [row] = await db
    .select({ id: outsideBroker.id })
    .from(outsideBroker)
    .where(eq(outsideBroker.mcNumber, mcNumber));
  return row ?? null;
};

export const assertBrokerExists = async (brokerId: string): Promise<void> => {
  const [row] = await db
    .select({ id: outsideBroker.id, status: outsideBroker.status })
    .from(outsideBroker)
    .where(eq(outsideBroker.id, brokerId));
  if (!row || row.status !== "approved") {
    throw new createError.NotFound("Outside broker not found");
  }
};
