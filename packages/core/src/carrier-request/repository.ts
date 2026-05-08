import { randomUUID } from "node:crypto";
import {
  type CarrierKind,
  type CarrierRequestStatus,
  carrier,
  carrierRequest,
  db,
  type InsuranceStatus,
  type OrderDirection,
  users,
} from "@twy/db";
import type { SQL } from "drizzle-orm";
import { and, asc, count, desc, eq, ilike, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import createError from "http-errors";
import type { AdvancedFilter, AdvancedFilterRule } from "../shared/advanced-filter-schema.js";
import { buildAdvancedFilterSql } from "../shared/advanced-filter-sql.js";
import type { CarrierRequestResponse } from "./response.js";

export interface ListCarrierRequestsInput {
  page: number;
  limit: number;
  sortField: "createdAt" | "carrierName" | "mcDotNumber" | "status";
  sortOrder: OrderDirection;
  status: CarrierRequestStatus | "all";
  query?: string;
  advancedFilter?: AdvancedFilter;
}

export interface SubmitCarrierRequestInput {
  kind: CarrierKind;
  carrierName: string;
  mcDotNumber: string;
  equipmentType?: string | null;
  insuranceStatus?: InsuranceStatus;
  insuranceExpiry?: Date | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  submittedBy: string;
}

const sortColumn = (field: ListCarrierRequestsInput["sortField"]) => {
  switch (field) {
    case "carrierName":
      return carrierRequest.carrierName;
    case "mcDotNumber":
      return carrierRequest.mcDotNumber;
    case "status":
      return carrierRequest.status;
    default:
      return carrierRequest.createdAt;
  }
};

const submitter = alias(users, "submitter");
const reviewer = alias(users, "reviewer");

const fullName = (
  first: string | null,
  last: string | null,
  email: string | null,
): string | null => {
  const parts = [first, last].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : (email ?? null);
};

const mapRow = (row: {
  id: string;
  kind: CarrierKind;
  carrierName: string;
  mcDotNumber: string;
  equipmentType: string | null;
  insuranceStatus: InsuranceStatus;
  insuranceExpiry: Date | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: CarrierRequestStatus;
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
  resultCarrierId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CarrierRequestResponse => ({
  id: row.id,
  kind: row.kind,
  carrierName: row.carrierName,
  mcDotNumber: row.mcDotNumber,
  equipmentType: row.equipmentType,
  insuranceStatus: row.insuranceStatus,
  insuranceExpiry: row.insuranceExpiry?.toISOString() ?? null,
  phone: row.phone,
  email: row.email,
  notes: row.notes,
  status: row.status,
  submittedBy: row.submittedBy,
  submittedByName: fullName(row.submitterFirstName, row.submitterLastName, row.submitterEmail),
  reviewedBy: row.reviewedBy,
  reviewedByName: fullName(row.reviewerFirstName, row.reviewerLastName, row.reviewerEmail),
  reviewedAt: row.reviewedAt?.toISOString() ?? null,
  rejectionReason: row.rejectionReason,
  resultCarrierId: row.resultCarrierId,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const buildCarrierRequestRuleCondition = (rule: AdvancedFilterRule): SQL<unknown> | undefined => {
  const { field, operator, value } = rule;
  if (!field || !operator || value === "") return undefined;

  switch (field) {
    case "kind":
      if (operator === "is" || operator === "equals")
        return eq(carrierRequest.kind, value as CarrierKind);
      if (operator === "is_not") return ne(carrierRequest.kind, value as CarrierKind);
      return undefined;
    case "carrierName":
      if (operator === "contains") return ilike(carrierRequest.carrierName, `%${value}%`);
      if (operator === "equals") return eq(carrierRequest.carrierName, value);
      if (operator === "starts_with") return ilike(carrierRequest.carrierName, `${value}%`);
      return undefined;
    case "mcDotNumber":
      if (operator === "contains") return ilike(carrierRequest.mcDotNumber, `%${value}%`);
      if (operator === "equals") return eq(carrierRequest.mcDotNumber, value);
      if (operator === "starts_with") return ilike(carrierRequest.mcDotNumber, `${value}%`);
      return undefined;
    case "equipmentType":
      if (operator === "contains") return ilike(carrierRequest.equipmentType, `%${value}%`);
      if (operator === "equals") return eq(carrierRequest.equipmentType, value);
      if (operator === "starts_with") return ilike(carrierRequest.equipmentType, `${value}%`);
      return undefined;
    case "phone":
      if (operator === "contains") return ilike(carrierRequest.phone, `%${value}%`);
      if (operator === "equals") return eq(carrierRequest.phone, value);
      if (operator === "starts_with") return ilike(carrierRequest.phone, `${value}%`);
      return undefined;
    case "email":
      if (operator === "contains") return ilike(carrierRequest.email, `%${value}%`);
      if (operator === "equals") return eq(carrierRequest.email, value);
      if (operator === "starts_with") return ilike(carrierRequest.email, `${value}%`);
      return undefined;
    case "notes":
      if (operator === "contains") return ilike(carrierRequest.notes, `%${value}%`);
      if (operator === "equals") return eq(carrierRequest.notes, value);
      if (operator === "starts_with") return ilike(carrierRequest.notes, `${value}%`);
      return undefined;
    case "rejectionReason":
      if (operator === "contains") return ilike(carrierRequest.rejectionReason, `%${value}%`);
      if (operator === "equals") return eq(carrierRequest.rejectionReason, value);
      if (operator === "starts_with") return ilike(carrierRequest.rejectionReason, `${value}%`);
      return undefined;
    case "status":
      if (operator === "is") return eq(carrierRequest.status, value as CarrierRequestStatus);
      if (operator === "is_not") return ne(carrierRequest.status, value as CarrierRequestStatus);
      return undefined;
    case "insuranceStatus":
      if (operator === "is") return eq(carrierRequest.insuranceStatus, value as InsuranceStatus);
      if (operator === "is_not")
        return ne(carrierRequest.insuranceStatus, value as InsuranceStatus);
      return undefined;
    default:
      return undefined;
  }
};

const carrierRequestDateColumn = (key: string) => {
  if (key === "updatedAt") return carrierRequest.updatedAt;
  if (key === "createdAt") return carrierRequest.createdAt;
  if (key === "reviewedAt") return carrierRequest.reviewedAt;
  if (key === "insuranceExpiry") return carrierRequest.insuranceExpiry;
  return undefined;
};

const buildCarrierRequestAdvancedClause = (
  filter: AdvancedFilter | undefined,
): SQL<unknown> | undefined => {
  if (!filter) return undefined;
  return buildAdvancedFilterSql(filter, buildCarrierRequestRuleCondition, carrierRequestDateColumn);
};

export const listCarrierRequests = async (input: ListCarrierRequestsInput) => {
  const direction = input.sortOrder === "asc" ? asc : desc;
  const orderCol = sortColumn(input.sortField);
  const offset = input.page * input.limit;

  const statusClause = input.status !== "all" ? eq(carrierRequest.status, input.status) : undefined;

  const searchClause = input.query
    ? or(
        ilike(carrierRequest.carrierName, `%${input.query}%`),
        ilike(carrierRequest.mcDotNumber, `%${input.query}%`),
      )
    : undefined;

  const filterClause = buildCarrierRequestAdvancedClause(input.advancedFilter);
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
        id: carrierRequest.id,
        kind: carrierRequest.kind,
        carrierName: carrierRequest.carrierName,
        mcDotNumber: carrierRequest.mcDotNumber,
        equipmentType: carrierRequest.equipmentType,
        insuranceStatus: carrierRequest.insuranceStatus,
        insuranceExpiry: carrierRequest.insuranceExpiry,
        phone: carrierRequest.phone,
        email: carrierRequest.email,
        notes: carrierRequest.notes,
        status: carrierRequest.status,
        submittedBy: carrierRequest.submittedBy,
        submitterFirstName: submitter.firstName,
        submitterLastName: submitter.lastName,
        submitterEmail: submitter.email,
        reviewedBy: carrierRequest.reviewedBy,
        reviewerFirstName: reviewer.firstName,
        reviewerLastName: reviewer.lastName,
        reviewerEmail: reviewer.email,
        reviewedAt: carrierRequest.reviewedAt,
        rejectionReason: carrierRequest.rejectionReason,
        resultCarrierId: carrierRequest.resultCarrierId,
        createdAt: carrierRequest.createdAt,
        updatedAt: carrierRequest.updatedAt,
      })
      .from(carrierRequest)
      .leftJoin(submitter, eq(carrierRequest.submittedBy, submitter.id))
      .leftJoin(reviewer, eq(carrierRequest.reviewedBy, reviewer.id))
      .where(whereClause)
      .orderBy(direction(orderCol))
      .limit(input.limit)
      .offset(offset),
    db.select({ value: count() }).from(carrierRequest).where(whereClause),
  ]);

  return {
    requests: rows.map(mapRow),
    total: Number(totalRows[0]?.value ?? 0),
  };
};

export const createCarrierRequest = async (input: SubmitCarrierRequestInput): Promise<string> => {
  const id = randomUUID();
  await db.insert(carrierRequest).values({
    id,
    kind: input.kind,
    carrierName: input.carrierName,
    mcDotNumber: input.mcDotNumber,
    equipmentType: input.equipmentType ?? null,
    insuranceStatus: input.insuranceStatus ?? "pending",
    insuranceExpiry: input.insuranceExpiry ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    notes: input.notes ?? null,
    status: "pending",
    submittedBy: input.submittedBy,
  });
  return id;
};

export const approveCarrierRequest = async (
  requestId: string,
  reviewerUserId: string,
): Promise<string> => {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(carrierRequest).where(eq(carrierRequest.id, requestId));

    if (!row) {
      throw new createError.NotFound("Carrier request not found");
    }
    if (row.status !== "pending") {
      throw new createError.BadRequest("Only pending requests can be approved");
    }

    const [dup] = await tx
      .select({ id: carrier.id })
      .from(carrier)
      .where(eq(carrier.mcDotNumber, row.mcDotNumber));

    if (dup) {
      throw new createError.Conflict("A carrier with this MC/DOT number already exists");
    }

    const carrierId = randomUUID();
    await tx.insert(carrier).values({
      id: carrierId,
      kind: row.kind,
      carrierName: row.carrierName,
      mcDotNumber: row.mcDotNumber,
      equipmentType: row.equipmentType,
      insuranceStatus: row.insuranceStatus,
      insuranceExpiry: row.insuranceExpiry,
      phone: row.phone,
      email: row.email,
      notes: row.notes,
      status: "approved",
      createdBy: reviewerUserId,
    });

    await tx
      .update(carrierRequest)
      .set({
        status: "approved",
        reviewedBy: reviewerUserId,
        reviewedAt: new Date(),
        resultCarrierId: carrierId,
        updatedAt: new Date(),
      })
      .where(eq(carrierRequest.id, requestId));

    return carrierId;
  });
};

export const rejectCarrierRequest = async (
  requestId: string,
  reviewerUserId: string,
  rejectionReason?: string | null,
): Promise<void> => {
  const [row] = await db
    .select({ id: carrierRequest.id, status: carrierRequest.status })
    .from(carrierRequest)
    .where(eq(carrierRequest.id, requestId));

  if (!row) {
    throw new createError.NotFound("Carrier request not found");
  }
  if (row.status !== "pending") {
    throw new createError.BadRequest("Only pending requests can be rejected");
  }

  await db
    .update(carrierRequest)
    .set({
      status: "rejected",
      reviewedBy: reviewerUserId,
      reviewedAt: new Date(),
      rejectionReason: rejectionReason?.trim() ? rejectionReason.trim() : null,
      updatedAt: new Date(),
    })
    .where(eq(carrierRequest.id, requestId));
};
