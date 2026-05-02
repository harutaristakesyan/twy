import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, ilike, ne, or } from "drizzle-orm";
import createError from "http-errors";
import { db } from "../client.js";
import { type BranchRow, branch, type OrderDirection, Roles, users } from "../schema/index.js";

export interface BranchOwnerRecord {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface Branch {
  id: string;
  name: string;
  contact: string | null;
  createdAt: string | null;
  owner: BranchOwnerRecord | null;
}

export interface NewBranchInput {
  name: string;
  contact?: string | null;
  ownerId: string;
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

const assignOwner = async (
  executor: Executor,
  branchId: string,
  ownerId: string | null,
): Promise<void> => {
  if (ownerId === null) {
    await executor
      .update(users)
      .set({ branch: null, updatedAt: new Date() })
      .where(and(eq(users.branch, branchId), eq(users.role, Roles.Owner)));
    return;
  }

  await ensureOwnerExists(executor, ownerId);

  await executor
    .update(users)
    .set({ branch: null, updatedAt: new Date() })
    .where(and(eq(users.branch, branchId), eq(users.role, Roles.Owner), ne(users.id, ownerId)));

  await executor
    .update(users)
    .set({ branch: branchId, updatedAt: new Date() })
    .where(and(eq(users.id, ownerId), eq(users.role, Roles.Owner)));
};

const sortColumn = (field: ListBranchesInput["sortField"]) => {
  if (field === "name") return branch.name;
  if (field === "contact") return branch.contact;
  return branch.createdAt;
};

const mapBranchRow = (
  row: Pick<BranchRow, "id" | "name" | "contact" | "createdAt"> & {
    ownerId: string | null;
    ownerEmail: string | null;
    ownerFirstName: string | null;
    ownerLastName: string | null;
  },
): Branch => ({
  id: row.id,
  name: row.name,
  contact: row.contact,
  createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  owner: row.ownerId
    ? {
        id: row.ownerId,
        email: row.ownerEmail ?? "",
        firstName: row.ownerFirstName,
        lastName: row.ownerLastName,
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

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: branch.id,
        name: branch.name,
        contact: branch.contact,
        createdAt: branch.createdAt,
        ownerId: users.id,
        ownerEmail: users.email,
        ownerFirstName: users.firstName,
        ownerLastName: users.lastName,
      })
      .from(branch)
      .leftJoin(users, eq(users.branch, branch.id))
      .where(searchClause)
      .orderBy(direction(orderColumn))
      .limit(input.limit)
      .offset(offset),
    db.select({ value: count() }).from(branch).where(searchClause),
  ]);

  return {
    branches: rows.map(mapBranchRow),
    total: Number(totalRows[0]?.value ?? 0),
  };
};

export const createBranch = async (input: NewBranchInput) =>
  db.transaction(async (tx) => {
    await ensureOwnerExists(tx, input.ownerId);

    const branchId = randomUUID();

    await tx.insert(branch).values({
      id: branchId,
      name: input.name,
      contact: input.contact ?? null,
    });

    await assignOwner(tx, branchId, input.ownerId);
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

    if (Object.keys(updatePayload).length > 0) {
      await tx
        .update(branch)
        .set({ ...updatePayload, updatedAt: new Date() })
        .where(eq(branch.id, branchId));
    }

    if (Object.hasOwn(input, "ownerId")) {
      await assignOwner(tx, branchId, input.ownerId ?? null);
    }

    return true;
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

    await tx
      .update(users)
      .set({ branch: null, updatedAt: new Date() })
      .where(eq(users.branch, branchId));

    await tx.delete(branch).where(eq(branch.id, branchId));

    return true;
  });
