import { randomUUID } from "node:crypto";
import {
  type BrokerRequestStatus,
  brokerRequest,
  db,
  type OrderDirection,
  outsideBroker,
  users,
} from "@twy/db";
import type { SQL } from "drizzle-orm";
import { and, asc, count, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import createError from "http-errors";
import type { AdvancedFilter } from "../shared/advanced-filter-schema.js";
import { buildDateRangeCondition } from "../shared/advanced-filter-sql.js";
import { formatUserName } from "../shared/formatters.js";
import type { BrokerRequestResponse } from "./response.js";

export interface ListBrokerRequestsInput {
  page: number;
  limit: number;
  sortField: "createdAt" | "brokerName" | "mcNumber" | "status";
  sortOrder: OrderDirection;
  status: BrokerRequestStatus | "all";
  query?: string;
  advancedFilter?: AdvancedFilter;
}

export interface SubmitBrokerRequestInput {
  brokerName: string;
  mcNumber: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
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

const submitter = alias(users, "submitter");
const reviewer = alias(users, "reviewer");

const mapRow = (row: {
  id: string;
  brokerName: string;
  mcNumber: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  creditLimitUnlimited: boolean;
  creditLimit: string | null;
  status: BrokerRequestStatus;
  submittedBy: string | null;
  submitterFirstName: string | null;
  submitterLastName: string | null;
  submitterEmail: string | null;
  reviewedBy: string | null;
  reviewerFirstName: string | null;
  reviewerLastName: string | null;
  reviewerEmail: string | null;
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
  creditLimitUnlimited: row.creditLimitUnlimited,
  creditLimit: row.creditLimit !== null ? Number(row.creditLimit) : null,
  status: row.status,
  submittedBy: row.submittedBy,
  submittedByName: formatUserName(
    row.submitterFirstName,
    row.submitterLastName,
    row.submitterEmail,
  ),
  reviewedBy: row.reviewedBy,
  reviewedByName: formatUserName(row.reviewerFirstName, row.reviewerLastName, row.reviewerEmail),
  reviewedAt: row.reviewedAt?.toISOString() ?? null,
  rejectionReason: row.rejectionReason,
  resultBrokerId: row.resultBrokerId,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const buildBrokerRequestAdvancedClause = (
  filter: AdvancedFilter | undefined,
): SQL<unknown> | undefined => {
  if (!filter) return undefined;
  const conds: SQL<unknown>[] = [];
  if (filter.status) conds.push(eq(brokerRequest.status, filter.status as BrokerRequestStatus));
  if (filter.creditLimitUnlimited !== undefined)
    conds.push(eq(brokerRequest.creditLimitUnlimited, filter.creditLimitUnlimited === "true"));
  if (filter.creditLimit__gte !== undefined)
    conds.push(gte(brokerRequest.creditLimit, filter.creditLimit__gte));
  if (filter.creditLimit__lte !== undefined)
    conds.push(lte(brokerRequest.creditLimit, filter.creditLimit__lte));
  const dateCond = buildDateRangeCondition(filter, "createdAt", brokerRequest.createdAt);
  if (dateCond) conds.push(dateCond);
  if (conds.length === 0) return undefined;
  return and(...conds);
};

export const listBrokerRequests = async (input: ListBrokerRequestsInput) => {
  const direction = input.sortOrder === "asc" ? asc : desc;
  const orderCol = sortColumn(input.sortField);
  const offset = input.page * input.limit;

  const statusClause = input.status !== "all" ? eq(brokerRequest.status, input.status) : undefined;
  const searchClause = input.query
    ? or(
        ilike(brokerRequest.brokerName, `%${input.query}%`),
        ilike(brokerRequest.mcNumber, `%${input.query}%`),
      )
    : undefined;
  const filterClause = buildBrokerRequestAdvancedClause(input.advancedFilter);
  const whereParts = [statusClause, searchClause, filterClause].filter(
    (x): x is SQL<unknown> => x !== undefined,
  );
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
        creditLimitUnlimited: brokerRequest.creditLimitUnlimited,
        creditLimit: brokerRequest.creditLimit,
        status: brokerRequest.status,
        submittedBy: brokerRequest.submittedBy,
        submitterFirstName: submitter.firstName,
        submitterLastName: submitter.lastName,
        submitterEmail: submitter.email,
        reviewedBy: brokerRequest.reviewedBy,
        reviewerFirstName: reviewer.firstName,
        reviewerLastName: reviewer.lastName,
        reviewerEmail: reviewer.email,
        reviewedAt: brokerRequest.reviewedAt,
        rejectionReason: brokerRequest.rejectionReason,
        resultBrokerId: brokerRequest.resultBrokerId,
        createdAt: brokerRequest.createdAt,
        updatedAt: brokerRequest.updatedAt,
      })
      .from(brokerRequest)
      .leftJoin(submitter, eq(brokerRequest.submittedBy, submitter.id))
      .leftJoin(reviewer, eq(brokerRequest.reviewedBy, reviewer.id))
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

export const getBrokerRequestById = async (
  requestId: string,
): Promise<BrokerRequestResponse | null> => {
  const [row] = await db
    .select({
      id: brokerRequest.id,
      brokerName: brokerRequest.brokerName,
      mcNumber: brokerRequest.mcNumber,
      contactName: brokerRequest.contactName,
      phone: brokerRequest.phone,
      email: brokerRequest.email,
      address: brokerRequest.address,
      notes: brokerRequest.notes,
      creditLimitUnlimited: brokerRequest.creditLimitUnlimited,
      creditLimit: brokerRequest.creditLimit,
      status: brokerRequest.status,
      submittedBy: brokerRequest.submittedBy,
      submitterFirstName: submitter.firstName,
      submitterLastName: submitter.lastName,
      submitterEmail: submitter.email,
      reviewedBy: brokerRequest.reviewedBy,
      reviewerFirstName: reviewer.firstName,
      reviewerLastName: reviewer.lastName,
      reviewerEmail: reviewer.email,
      reviewedAt: brokerRequest.reviewedAt,
      rejectionReason: brokerRequest.rejectionReason,
      resultBrokerId: brokerRequest.resultBrokerId,
      createdAt: brokerRequest.createdAt,
      updatedAt: brokerRequest.updatedAt,
    })
    .from(brokerRequest)
    .leftJoin(submitter, eq(brokerRequest.submittedBy, submitter.id))
    .leftJoin(reviewer, eq(brokerRequest.reviewedBy, reviewer.id))
    .where(eq(brokerRequest.id, requestId));

  return row ? mapRow(row) : null;
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
