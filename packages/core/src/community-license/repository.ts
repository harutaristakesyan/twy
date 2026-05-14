import type { OrderDirection } from "@twy/db";
import { branch, communityLicenses, db } from "@twy/db";
import { asc, count, desc, eq, ilike } from "drizzle-orm";
import createError from "http-errors";

export interface CommunityLicense {
  id: string;
  ciNumber: string;
  validFrom: string;
  validTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewCommunityLicenseInput {
  ciNumber: string;
  validFrom: string;
  validTo?: string | null;
  createdBy: string;
}

export interface UpdateCommunityLicenseInput {
  ciNumber?: string;
  validFrom?: string;
  validTo?: string | null;
}

export interface ListCommunityLicensesInput {
  page: number;
  limit: number;
  sortField: "ciNumber" | "validFrom" | "createdAt";
  sortOrder: OrderDirection;
  query?: string;
}

const sortColumn = (field: ListCommunityLicensesInput["sortField"]) => {
  if (field === "ciNumber") return communityLicenses.ciNumber;
  if (field === "validFrom") return communityLicenses.validFrom;
  return communityLicenses.createdAt;
};

const mapRow = (row: {
  id: string;
  ciNumber: string;
  validFrom: string;
  validTo: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CommunityLicense => ({
  id: row.id,
  ciNumber: row.ciNumber,
  validFrom: row.validFrom,
  validTo: row.validTo,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const listCommunityLicenses = async (input: ListCommunityLicensesInput) => {
  const direction = input.sortOrder === "asc" ? asc : desc;
  const orderColumn = sortColumn(input.sortField);
  const offset = input.page * input.limit;

  const whereClause = input.query
    ? ilike(communityLicenses.ciNumber, `%${input.query}%`)
    : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: communityLicenses.id,
        ciNumber: communityLicenses.ciNumber,
        validFrom: communityLicenses.validFrom,
        validTo: communityLicenses.validTo,
        createdAt: communityLicenses.createdAt,
        updatedAt: communityLicenses.updatedAt,
      })
      .from(communityLicenses)
      .where(whereClause)
      .orderBy(direction(orderColumn))
      .limit(input.limit)
      .offset(offset),
    db.select({ value: count() }).from(communityLicenses).where(whereClause),
  ]);

  return {
    communityLicenses: rows.map(mapRow),
    total: Number(totalRows[0]?.value ?? 0),
  };
};

export const getCommunityLicenseById = async (id: string): Promise<CommunityLicense | null> => {
  const [row] = await db.select().from(communityLicenses).where(eq(communityLicenses.id, id));

  return row ? mapRow(row) : null;
};

export const createCommunityLicense = async (input: NewCommunityLicenseInput): Promise<void> => {
  const existing = await db
    .select({ id: communityLicenses.id })
    .from(communityLicenses)
    .where(eq(communityLicenses.ciNumber, input.ciNumber));

  if (existing.length > 0) {
    throw new createError.Conflict(`CI number "${input.ciNumber}" already exists`);
  }

  await db.insert(communityLicenses).values({
    ciNumber: input.ciNumber,
    validFrom: input.validFrom,
    validTo: input.validTo ?? null,
    createdBy: input.createdBy,
  });
};

export const updateCommunityLicense = async (
  id: string,
  input: UpdateCommunityLicenseInput,
): Promise<boolean> => {
  const [existing] = await db
    .select({ id: communityLicenses.id })
    .from(communityLicenses)
    .where(eq(communityLicenses.id, id));

  if (!existing) return false;

  if (input.ciNumber) {
    const conflict = await db
      .select({ id: communityLicenses.id })
      .from(communityLicenses)
      .where(eq(communityLicenses.ciNumber, input.ciNumber));

    if (conflict.length > 0 && conflict[0].id !== id) {
      throw new createError.Conflict(`CI number "${input.ciNumber}" already exists`);
    }
  }

  const updatePayload: Partial<typeof communityLicenses.$inferInsert> = {};
  if (typeof input.ciNumber !== "undefined") updatePayload.ciNumber = input.ciNumber;
  if (typeof input.validFrom !== "undefined") updatePayload.validFrom = input.validFrom;
  if (Object.hasOwn(input, "validTo")) updatePayload.validTo = input.validTo ?? null;

  await db
    .update(communityLicenses)
    .set({ ...updatePayload, updatedAt: new Date() })
    .where(eq(communityLicenses.id, id));

  return true;
};

export const deleteCommunityLicense = async (id: string): Promise<boolean> => {
  const [existing] = await db
    .select({ id: communityLicenses.id })
    .from(communityLicenses)
    .where(eq(communityLicenses.id, id));

  if (!existing) return false;

  const refs = await db.select({ id: branch.id }).from(branch).where(eq(branch.ciId, id));

  if (refs.length > 0) {
    throw new createError.Conflict(
      `Cannot delete — this Community License is used by ${refs.length} branch(es)`,
    );
  }

  await db.delete(communityLicenses).where(eq(communityLicenses.id, id));
  return true;
};
