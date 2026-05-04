import { randomUUID } from "node:crypto";
import { branch, db, type OrderDirection, users } from "@twy/db";
import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import createError from "http-errors";

export interface BranchOwner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Branch {
  id: string;
  name: string;
  contact: string | null;
  createdAt: string | null;
  owner: BranchOwner | null;
}

export interface NewBranchInput {
  name: string;
  contact?: string | null;
  ownerId?: string | null;
}

export interface UpdateBranchInput {
  name?: string;
  contact?: string | null;
  ownerId?: string | null;
}

export interface ListBranchesInput {
  page: number;
  limit: number;
  sortField: "createdAt" | "name" | "contact";
  sortOrder: OrderDirection;
  query?: string;
  branchId?: string;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

const ensureOwnerExists = async (executor: Executor, ownerId: string): Promise<void> => {
  const [existing] = await executor
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, ownerId));

  if (!existing) {
    throw new createError.NotFound("Owner not found");
  }
};

const sortColumn = (field: ListBranchesInput["sortField"]) => {
  if (field === "name") return branch.name;
  if (field === "contact") return branch.contact;
  return branch.createdAt;
};

const mapBranchRow = (row: {
  id: string;
  name: string;
  contact: string | null;
  createdAt: Date | null;
  ownerId: string | null;
  ownerFirstName: string | null;
  ownerLastName: string | null;
  ownerEmail: string | null;
}): Branch => ({
  id: row.id,
  name: row.name,
  contact: row.contact,
  createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  owner:
    row.ownerId && row.ownerFirstName && row.ownerLastName && row.ownerEmail
      ? {
          id: row.ownerId,
          firstName: row.ownerFirstName,
          lastName: row.ownerLastName,
          email: row.ownerEmail,
        }
      : null,
});

export const listBranches = async (input: ListBranchesInput) => {
  const direction = input.sortOrder === "asc" ? asc : desc;
  const orderColumn = sortColumn(input.sortField);
  const offset = input.page * input.limit;

  const searchClause = input.query
    ? or(ilike(branch.name, `%${input.query}%`), ilike(branch.contact, `%${input.query}%`))
    : undefined;
  const branchClause = input.branchId ? eq(branch.id, input.branchId) : undefined;
  const whereClause = and(searchClause, branchClause);

  const owner = users;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: branch.id,
        name: branch.name,
        contact: branch.contact,
        createdAt: branch.createdAt,
        ownerId: owner.id,
        ownerFirstName: owner.firstName,
        ownerLastName: owner.lastName,
        ownerEmail: owner.email,
      })
      .from(branch)
      .leftJoin(owner, eq(owner.id, branch.ownerId))
      .where(whereClause)
      .orderBy(direction(orderColumn))
      .limit(input.limit)
      .offset(offset),
    db.select({ value: count() }).from(branch).where(whereClause),
  ]);

  return {
    branches: rows.map(mapBranchRow),
    total: Number(totalRows[0]?.value ?? 0),
  };
};

export const createBranch = async (input: NewBranchInput) =>
  db.transaction(async (tx) => {
    if (input.ownerId) {
      await ensureOwnerExists(tx, input.ownerId);
    }

    const branchId = randomUUID();

    await tx.insert(branch).values({
      id: branchId,
      name: input.name,
      contact: input.contact ?? null,
      ownerId: input.ownerId ?? null,
    });

    if (input.ownerId) {
      await tx
        .update(users)
        .set({ branch: branchId, updatedAt: new Date() })
        .where(eq(users.id, input.ownerId));
    }
  });

export const updateBranch = async (branchId: string, input: UpdateBranchInput) =>
  db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: branch.id })
      .from(branch)
      .where(eq(branch.id, branchId));

    if (!existing) {
      return null;
    }

    const updatePayload: Partial<typeof branch.$inferInsert> = {};

    if (typeof input.name !== "undefined") {
      updatePayload.name = input.name;
    }

    if (Object.hasOwn(input, "contact")) {
      updatePayload.contact = input.contact ?? null;
    }

    if (Object.hasOwn(input, "ownerId")) {
      const newOwnerId = input.ownerId ?? null;
      if (newOwnerId) {
        await ensureOwnerExists(tx, newOwnerId);
        await tx
          .update(users)
          .set({ branch: branchId, updatedAt: new Date() })
          .where(eq(users.id, newOwnerId));
      }
      updatePayload.ownerId = newOwnerId;
    }

    await tx
      .update(branch)
      .set({ ...updatePayload, updatedAt: new Date() })
      .where(eq(branch.id, branchId));

    return true as const;
  });

export const deleteBranch = async (branchId: string): Promise<boolean> =>
  db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: branch.id })
      .from(branch)
      .where(eq(branch.id, branchId));

    if (!existing) {
      return false;
    }

    await tx.delete(branch).where(eq(branch.id, branchId));

    return true;
  });
