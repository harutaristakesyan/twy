import { randomUUID } from "node:crypto";
import {
  type BrokerRequestStatus,
  brokerRequest,
  db,
  type OrderDirection,
  outsideBroker,
} from "@twy/db";
import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import createError from "http-errors";
import type { BrokerRequestResponse } from "./response.js";

export interface ListBrokerRequestsInput {
  page: number;
  limit: number;
  sortField: "createdAt" | "brokerName" | "mcNumber" | "status";
  sortOrder: OrderDirection;
  status: BrokerRequestStatus | "all";
  query?: string;
}

export interface SubmitBrokerRequestInput {
  brokerName: string;
  mcNumber: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  branchId?: string | null;
  creditLimitUnlimited: boolean;
  creditLimit?: number | null;
  submittedBy: string;
}

const sortColumn = (field: ListBrokerRequestsInput["sortField"]) => {
  switch (field) {
    case "brokerName":
      return brokerRequest.brokerName;
    case "mcNumber":
      return brokerRequest.mcNumber;
    case "status":
      return brokerRequest.status;
    default:
      return brokerRequest.createdAt;
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
  branchId: string | null;
  creditLimitUnlimited: boolean;
  creditLimit: string | null;
  status: BrokerRequestStatus;
  submittedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  resultBrokerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): BrokerRequestResponse => ({
  id: row.id,
  brokerName: row.brokerName,
  mcNumber: row.mcNumber,
  contactName: row.contactName,
  phone: row.phone,
  email: row.email,
  address: row.address,
  notes: row.notes,
  branchId: row.branchId,
  creditLimitUnlimited: row.creditLimitUnlimited,
  creditLimit: row.creditLimit !== null ? Number(row.creditLimit) : null,
  status: row.status,
  submittedBy: row.submittedBy,
  reviewedBy: row.reviewedBy,
  reviewedAt: row.reviewedAt?.toISOString() ?? null,
  rejectionReason: row.rejectionReason,
  resultBrokerId: row.resultBrokerId,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const listBrokerRequests = async (input: ListBrokerRequestsInput) => {
  const direction = input.sortOrder === "asc" ? asc : desc;
  const orderCol = sortColumn(input.sortField);
  const offset = input.page * input.limit;

  const whereParts = [];
  if (input.status !== "all") {
    whereParts.push(eq(brokerRequest.status, input.status));
  }
  if (input.query) {
    whereParts.push(
      or(
        ilike(brokerRequest.brokerName, `%${input.query}%`),
        ilike(brokerRequest.mcNumber, `%${input.query}%`),
      ),
    );
  }
  const whereClause =
    whereParts.length === 0
      ? undefined
      : whereParts.length === 1
        ? whereParts[0]
        : and(...whereParts);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: brokerRequest.id,
        brokerName: brokerRequest.brokerName,
        mcNumber: brokerRequest.mcNumber,
        contactName: brokerRequest.contactName,
        phone: brokerRequest.phone,
        email: brokerRequest.email,
        address: brokerRequest.address,
        notes: brokerRequest.notes,
        branchId: brokerRequest.branchId,
        creditLimitUnlimited: brokerRequest.creditLimitUnlimited,
        creditLimit: brokerRequest.creditLimit,
        status: brokerRequest.status,
        submittedBy: brokerRequest.submittedBy,
        reviewedBy: brokerRequest.reviewedBy,
        reviewedAt: brokerRequest.reviewedAt,
        rejectionReason: brokerRequest.rejectionReason,
        resultBrokerId: brokerRequest.resultBrokerId,
        createdAt: brokerRequest.createdAt,
        updatedAt: brokerRequest.updatedAt,
      })
      .from(brokerRequest)
      .where(whereClause)
      .orderBy(direction(orderCol))
      .limit(input.limit)
      .offset(offset),
    db.select({ value: count() }).from(brokerRequest).where(whereClause),
  ]);

  return {
    requests: rows.map(mapRow),
    total: Number(totalRows[0]?.value ?? 0),
  };
};

export const createBrokerRequest = async (input: SubmitBrokerRequestInput): Promise<string> => {
  const id = randomUUID();
  await db.insert(brokerRequest).values({
    id,
    brokerName: input.brokerName,
    mcNumber: input.mcNumber,
    contactName: input.contactName ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    notes: input.notes ?? null,
    branchId: input.branchId ?? null,
    creditLimitUnlimited: input.creditLimitUnlimited,
    creditLimit:
      !input.creditLimitUnlimited && input.creditLimit != null
        ? input.creditLimit.toString()
        : null,
    status: "pending",
    submittedBy: input.submittedBy,
  });
  return id;
};

export const approveBrokerRequest = async (
  requestId: string,
  reviewerUserId: string,
): Promise<string> => {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(brokerRequest).where(eq(brokerRequest.id, requestId));

    if (!row) {
      throw new createError.NotFound("Broker request not found");
    }
    if (row.status !== "pending") {
      throw new createError.BadRequest("Only pending requests can be approved");
    }

    const [dup] = await tx
      .select({ id: outsideBroker.id })
      .from(outsideBroker)
      .where(eq(outsideBroker.mcNumber, row.mcNumber));

    if (dup) {
      throw new createError.Conflict("An outside broker with this MC number already exists");
    }

    const brokerId = randomUUID();
    await tx.insert(outsideBroker).values({
      id: brokerId,
      brokerName: row.brokerName,
      mcNumber: row.mcNumber,
      contactName: row.contactName,
      phone: row.phone,
      email: row.email,
      address: row.address,
      notes: row.notes,
      status: "approved",
      branchId: row.branchId,
      creditLimitUnlimited: row.creditLimitUnlimited,
      creditLimit: row.creditLimit,
      createdBy: reviewerUserId,
    });

    await tx
      .update(brokerRequest)
      .set({
        status: "approved",
        reviewedBy: reviewerUserId,
        reviewedAt: new Date(),
        resultBrokerId: brokerId,
        updatedAt: new Date(),
      })
      .where(eq(brokerRequest.id, requestId));

    return brokerId;
  });
};

export const rejectBrokerRequest = async (
  requestId: string,
  reviewerUserId: string,
  rejectionReason?: string | null,
): Promise<void> => {
  const [row] = await db
    .select({ id: brokerRequest.id, status: brokerRequest.status })
    .from(brokerRequest)
    .where(eq(brokerRequest.id, requestId));

  if (!row) {
    throw new createError.NotFound("Broker request not found");
  }
  if (row.status !== "pending") {
    throw new createError.BadRequest("Only pending requests can be rejected");
  }

  await db
    .update(brokerRequest)
    .set({
      status: "rejected",
      reviewedBy: reviewerUserId,
      reviewedAt: new Date(),
      rejectionReason: rejectionReason?.trim() ? rejectionReason.trim() : null,
      updatedAt: new Date(),
    })
    .where(eq(brokerRequest.id, requestId));
};
