import { randomUUID } from "node:crypto";
import type { BrokerStatus } from "@twy/db";
import { branch, db, type OrderDirection, outsideBroker } from "@twy/db";
import { asc, count, desc, eq, ilike, or } from "drizzle-orm";
import createError from "http-errors";

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
  branch: { id: string; name: string } | null;
  creditLimitUnlimited: boolean;
  creditLimit: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListBrokersInput {
  page: number;
  limit: number;
  sortField: "brokerName" | "mcNumber" | "status" | "createdAt" | "branch";
  sortOrder: OrderDirection;
  query?: string;
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
  branchId?: string | null;
  creditLimitUnlimited: boolean;
  creditLimit?: number | null;
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
  branchId?: string | null;
  creditLimitUnlimited?: boolean;
  creditLimit?: number | null;
}

const sortColumn = (field: ListBrokersInput["sortField"]) => {
  switch (field) {
    case "brokerName":
      return outsideBroker.brokerName;
    case "mcNumber":
      return outsideBroker.mcNumber;
    case "status":
      return outsideBroker.status;
    case "branch":
      return branch.name;
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
  branchId: string | null;
  creditLimitUnlimited: boolean;
  creditLimit: string | null;
  createdAt: Date;
  updatedAt: Date;
  branchName: string | null;
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
  branch: row.branchId && row.branchName ? { id: row.branchId, name: row.branchName } : null,
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
        branchId: outsideBroker.branchId,
        creditLimitUnlimited: outsideBroker.creditLimitUnlimited,
        creditLimit: outsideBroker.creditLimit,
        createdAt: outsideBroker.createdAt,
        updatedAt: outsideBroker.updatedAt,
        branchName: branch.name,
      })
      .from(outsideBroker)
      .leftJoin(branch, eq(outsideBroker.branchId, branch.id))
      .where(searchClause)
      .orderBy(direction(orderCol))
      .limit(input.limit)
      .offset(offset),
    db.select({ value: count() }).from(outsideBroker).where(searchClause),
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
    status: (input.status ?? "pending") as BrokerStatus,
    branchId: input.branchId ?? null,
    creditLimitUnlimited: input.creditLimitUnlimited,
    creditLimit:
      !input.creditLimitUnlimited && input.creditLimit != null
        ? input.creditLimit.toString()
        : null,
  });
  return id;
};

export const updateBroker = async (
  brokerId: string,
  input: UpdateBrokerInput,
): Promise<boolean | null> => {
  const [existing] = await db
    .select({ id: outsideBroker.id })
    .from(outsideBroker)
    .where(eq(outsideBroker.id, brokerId));

  if (!existing) {
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
  if (Object.hasOwn(input, "branchId")) payload.branchId = input.branchId ?? null;

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
    .select({ id: outsideBroker.id })
    .from(outsideBroker)
    .where(eq(outsideBroker.id, brokerId));

  if (!existing) {
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

// Validate that broker exists; throws 404 if not
export const assertBrokerExists = async (brokerId: string): Promise<void> => {
  const [row] = await db
    .select({ id: outsideBroker.id })
    .from(outsideBroker)
    .where(eq(outsideBroker.id, brokerId));
  if (!row) {
    throw new createError.NotFound("Outside broker not found");
  }
};
