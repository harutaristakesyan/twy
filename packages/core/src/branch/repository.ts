import { randomUUID } from "node:crypto";
import { branch, communityLicenses, db, type OrderDirection, users } from "@twy/db";
import type { SQL } from "drizzle-orm";
import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import createError from "http-errors";
import { rebuildAuthContext } from "../auth-context/rebuild.js";
import type { AdvancedFilter } from "../shared/advanced-filter-schema.js";

export interface BranchOwner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface BranchCI {
  id: string;
  ciNumber: string;
  validFrom: string;
  validTo: string | null;
}

export interface Branch {
  id: string;
  name: string;
  contact: string | null;
  createdAt: string | null;
  owner: BranchOwner | null;
  ci: BranchCI | null;
}

export interface NewBranchInput {
  name: string;
  contact?: string | null;
  ownerId?: string | null;
  ciId?: string | null;
}

export interface UpdateBranchInput {
  name?: string;
  contact?: string | null;
  ownerId?: string | null;
  ciId?: string | null;
}

export interface ListBranchesInput {
  page: number;
  limit: number;
  sortField: "createdAt" | "name" | "contact";
  sortOrder: OrderDirection;
  query?: string;
  branchId?: string;
  advancedFilter?: AdvancedFilter;
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

// Branch management table sends no filter fields — advancedFilter is accepted for forward compat
// but no conditions are built from it.
const buildBranchAdvancedClause = (_filter: AdvancedFilter | undefined): SQL<unknown> | undefined =>
  undefined;

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
  ciId: string | null;
  ciNumber: string | null;
  ciValidFrom: string | null;
  ciValidTo: string | null;
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
  ci:
    row.ciId !== null
      ? {
          id: row.ciId,
          ciNumber: row.ciNumber!,
          validFrom: row.ciValidFrom!,
          validTo: row.ciValidTo,
        }
      : null,
});

export const getBranchById = async (branchId: string): Promise<Branch | null> => {
  const owner = users;
  const ci = communityLicenses;

  const [row] = await db
    .select({
      id: branch.id,
      name: branch.name,
      contact: branch.contact,
      createdAt: branch.createdAt,
      ownerId: owner.id,
      ownerFirstName: owner.firstName,
      ownerLastName: owner.lastName,
      ownerEmail: owner.email,
      ciId: ci.id,
      ciNumber: ci.ciNumber,
      ciValidFrom: ci.validFrom,
      ciValidTo: ci.validTo,
    })
    .from(branch)
    .leftJoin(owner, eq(owner.id, branch.ownerId))
    .leftJoin(ci, eq(ci.id, branch.ciId))
    .where(eq(branch.id, branchId));

  return row ? mapBranchRow(row) : null;
};

export const listBranches = async (input: ListBranchesInput) => {
  const direction = input.sortOrder === "asc" ? asc : desc;
  const orderColumn = sortColumn(input.sortField);
  const offset = input.page * input.limit;

  const searchClause = input.query
    ? or(ilike(branch.name, `%${input.query}%`), ilike(branch.contact, `%${input.query}%`))
    : undefined;
  const branchClause = input.branchId ? eq(branch.id, input.branchId) : undefined;
  const owner = users;
  const ci = communityLicenses;
  const filterClause = buildBranchAdvancedClause(input.advancedFilter);
  const whereClause = and(searchClause, branchClause, filterClause);

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
        ciId: ci.id,
        ciNumber: ci.ciNumber,
        ciValidFrom: ci.validFrom,
        ciValidTo: ci.validTo,
      })
      .from(branch)
      .leftJoin(owner, eq(owner.id, branch.ownerId))
      .leftJoin(ci, eq(ci.id, branch.ciId))
      .where(whereClause)
      .orderBy(direction(orderColumn))
      .limit(input.limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(branch)
      .leftJoin(owner, eq(owner.id, branch.ownerId))
      .where(whereClause),
  ]);

  return {
    branches: rows.map(mapBranchRow),
    total: Number(totalRows[0]?.value ?? 0),
  };
};

export const createBranch = async (input: NewBranchInput) => {
  await db.transaction(async (tx) => {
    if (input.ownerId) {
      await ensureOwnerExists(tx, input.ownerId);
    }

    const branchId = randomUUID();

    await tx.insert(branch).values({
      id: branchId,
      name: input.name,
      contact: input.contact ?? null,
      ownerId: input.ownerId ?? null,
      ciId: input.ciId ?? null,
    });

    if (input.ownerId) {
      await tx
        .update(users)
        .set({ branch: branchId, updatedAt: new Date() })
        .where(eq(users.id, input.ownerId));
    }
  });

  // Rebuild after commit — branch assignment changes branchId in the auth context.
  if (input.ownerId) {
    rebuildAuthContext(input.ownerId).catch((err) => {
      console.warn("auth-context rebuild after createBranch failed:", err);
    });
  }
};

export const updateBranch = async (branchId: string, input: UpdateBranchInput) => {
  let newOwnerId: string | null | undefined;
  let prevOwnerId: string | null | undefined;

  const result = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: branch.id, ownerId: branch.ownerId })
      .from(branch)
      .where(eq(branch.id, branchId));
    prevOwnerId = existing?.ownerId ?? null;

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
      newOwnerId = input.ownerId ?? null;
      if (newOwnerId) {
        await ensureOwnerExists(tx, newOwnerId);
        await tx
          .update(users)
          .set({ branch: branchId, updatedAt: new Date() })
          .where(eq(users.id, newOwnerId));
      }
      updatePayload.ownerId = newOwnerId;
    }

    if (input.ciId !== undefined) {
      updatePayload.ciId = input.ciId;
    }

    await tx
      .update(branch)
      .set({ ...updatePayload, updatedAt: new Date() })
      .where(eq(branch.id, branchId));

    return true as const;
  });

  // Rebuild both previous and new owner — each gets a changed branchId.
  if (result) {
    if (newOwnerId) {
      rebuildAuthContext(newOwnerId).catch((err) => {
        console.warn("auth-context rebuild (new owner) after updateBranch failed:", err);
      });
    }
    if (prevOwnerId && prevOwnerId !== newOwnerId) {
      rebuildAuthContext(prevOwnerId).catch((err) => {
        console.warn("auth-context rebuild (prev owner) after updateBranch failed:", err);
      });
    }
  }

  return result;
};

export const deleteBranch = async (branchId: string): Promise<boolean> => {
  // Capture owner before deletion so we can evict their DDB cache entry after commit.
  const [branchRow] = await db
    .select({ ownerId: branch.ownerId })
    .from(branch)
    .where(eq(branch.id, branchId));

  const deleted = await db.transaction(async (tx) => {
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

  if (deleted && branchRow?.ownerId) {
    rebuildAuthContext(branchRow.ownerId).catch((err) => {
      console.warn("auth-context rebuild after deleteBranch failed:", err);
    });
  }

  return deleted;
};
