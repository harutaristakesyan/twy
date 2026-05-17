import { branch, db, file, type NewUser, type OrderDirection, team, users } from "@twy/db";
import type { SQL } from "drizzle-orm";
import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import createError from "http-errors";
import { rebuildAuthContext } from "../auth-context/rebuild.js";
import { deleteAuthContext } from "../auth-context/store.js";
import type { AdvancedFilter } from "../shared/advanced-filter-schema.js";
import { buildDateRangeCondition } from "../shared/advanced-filter-sql.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export const createUser = async (input: NewUser): Promise<void> => {
  await db.insert(users).values(input);
  rebuildAuthContext(input.id).catch((err) => {
    console.warn("auth-context rebuild after createUser failed:", err);
  });
};

interface UserDetailsRow {
  id?: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isActive: boolean;
  branchId: string | null;
  branchName: string | null;
  teamId: string | null;
  teamName: string | null;
  profilePictureFileId: string | null;
  createdAt: Date | null;
}

const mapUserDetails = (row: UserDetailsRow) => ({
  email: row.email,
  firstName: row.firstName,
  lastName: row.lastName,
  phone: row.phone ?? null,
  isActive: row.isActive,
  branch: row.branchId ? { id: row.branchId, name: row.branchName } : null,
  teamId: row.teamId ?? null,
  teamName: row.teamName ?? null,
  profilePictureFileId: row.profilePictureFileId ?? null,
  createdAt: row.createdAt ? row.createdAt.toISOString() : null,
});

const ensureBranchExists = async (executor: Executor, branchId: string): Promise<void> => {
  const [existing] = await executor
    .select({ id: branch.id })
    .from(branch)
    .where(eq(branch.id, branchId));

  if (!existing) {
    throw new createError.NotFound("Branch not found");
  }
};

const ensureTeamExists = async (executor: Executor, teamId: string): Promise<void> => {
  const [existing] = await executor.select({ id: team.id }).from(team).where(eq(team.id, teamId));

  if (!existing) {
    throw new createError.NotFound("Team not found");
  }
};

export const getUserEmail = async (userId: string): Promise<string> => {
  const [row] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));

  if (!row) {
    throw new createError.NotFound("User not found");
  }

  return row.email;
};

export const getFullUserInfoById = async (userId: string) => {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      isActive: users.isActive,
      branchId: users.branch,
      branchName: branch.name,
      teamId: users.teamId,
      teamName: team.name,
      profilePictureFileId: users.profilePictureFileId,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(branch, eq(users.branch, branch.id))
    .leftJoin(team, eq(users.teamId, team.id))
    .where(eq(users.id, userId));

  if (!row) {
    throw new createError.NotFound("User not found");
  }

  return { id: row.id, ...mapUserDetails(row) };
};

export interface ListUsersInput {
  page: number;
  limit: number;
  sortField:
    | "users.firstName"
    | "users.lastName"
    | "users.email"
    | "users.isActive"
    | "users.createdAt"
    | "branch.name";
  sortOrder: OrderDirection;
  query?: string;
  branchId?: string;
  advancedFilter?: AdvancedFilter;
}

const buildUserAdvancedClause = (filter: AdvancedFilter | undefined): SQL<unknown> | undefined => {
  if (!filter) return undefined;
  const conds: SQL<unknown>[] = [];
  if (filter.isActive !== undefined) conds.push(eq(users.isActive, filter.isActive === "true"));
  const dateCond = buildDateRangeCondition(filter, "createdAt", users.createdAt);
  if (dateCond) conds.push(dateCond);
  if (conds.length === 0) return undefined;
  return and(...conds);
};

const userSortColumn = (field: ListUsersInput["sortField"]) => {
  switch (field) {
    case "users.firstName":
      return users.firstName;
    case "users.lastName":
      return users.lastName;
    case "users.email":
      return users.email;
    case "users.isActive":
      return users.isActive;
    case "branch.name":
      return branch.name;
    default:
      return users.createdAt;
  }
};

export const listUsers = async (input: ListUsersInput) => {
  const direction = input.sortOrder === "asc" ? asc : desc;
  const orderColumn = userSortColumn(input.sortField);
  const offset = input.page * input.limit;

  const searchClause = input.query
    ? or(
        ilike(users.firstName, `%${input.query}%`),
        ilike(users.lastName, `%${input.query}%`),
        ilike(users.email, `%${input.query}%`),
      )
    : undefined;
  const branchClause = input.branchId ? eq(users.branch, input.branchId) : undefined;
  const filterClause = buildUserAdvancedClause(input.advancedFilter);
  const whereClause = and(searchClause, branchClause, filterClause);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        isActive: users.isActive,
        branchId: users.branch,
        branchName: branch.name,
        teamId: users.teamId,
        teamName: team.name,
        profilePictureFileId: users.profilePictureFileId,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(branch, eq(users.branch, branch.id))
      .leftJoin(team, eq(users.teamId, team.id))
      .where(whereClause)
      .orderBy(direction(orderColumn))
      .limit(input.limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(users)
      .leftJoin(branch, eq(users.branch, branch.id))
      .leftJoin(team, eq(users.teamId, team.id))
      .where(whereClause),
  ]);

  return {
    users: rows.map((row) => ({ id: row.id, ...mapUserDetails(row) })),
    total: Number(totalRows[0]?.value ?? 0),
  };
};

export interface UpdateUserInput {
  branchId?: string | null;
  teamId?: string | null;
  isActive?: boolean;
}

export const updateUser = async (userId: string, input: UpdateUserInput): Promise<boolean> => {
  const updated = await db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId));

    if (!existing) {
      return false;
    }

    const updatePayload: Partial<typeof users.$inferInsert> = {};

    if (Object.hasOwn(input, "branchId")) {
      const branchId = input.branchId ?? null;

      if (branchId) {
        await ensureBranchExists(tx, branchId);
      }

      updatePayload.branch = branchId;
    }

    if (Object.hasOwn(input, "teamId")) {
      const teamId = input.teamId ?? null;

      if (teamId) {
        await ensureTeamExists(tx, teamId);
      }

      updatePayload.teamId = teamId;
    }

    if (typeof input.isActive !== "undefined") {
      updatePayload.isActive = input.isActive;
    }

    if (Object.keys(updatePayload).length > 0) {
      await tx
        .update(users)
        .set({ ...updatePayload, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }

    return true;
  });

  // Rebuild after commit so getEffectivePermissionsForUser reads the new row.
  if (updated) {
    rebuildAuthContext(userId).catch((err) => {
      console.warn("auth-context rebuild after updateUser failed:", err);
    });
  }

  return updated;
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  const deleted = await db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId));

    if (!existing) {
      return false;
    }

    await tx.delete(users).where(eq(users.id, userId));

    return true;
  });

  if (deleted) {
    deleteAuthContext(userId).catch((err) => {
      console.warn("auth-context delete after deleteUser failed:", err);
    });
  }

  return deleted;
};

export interface SelfUpdateUserInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  profilePictureFileId?: string | null;
}

export const updateSelfUser = async (
  userId: string,
  input: SelfUpdateUserInput,
): Promise<boolean> => {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));

  if (!existing) {
    return false;
  }

  const updatePayload: Partial<typeof users.$inferInsert> = {};

  if (typeof input.firstName !== "undefined") {
    updatePayload.firstName = input.firstName;
  }

  if (typeof input.lastName !== "undefined") {
    updatePayload.lastName = input.lastName;
  }

  if (Object.hasOwn(input, "phone")) {
    updatePayload.phone = input.phone ?? null;
  }

  if (Object.hasOwn(input, "profilePictureFileId")) {
    const fileId = input.profilePictureFileId ?? null;
    if (fileId !== null) {
      const [fileRow] = await db
        .select({ id: file.id })
        .from(file)
        .where(and(eq(file.id, fileId), eq(file.createdBy, userId)));
      if (!fileRow) {
        throw new createError.NotFound("Profile picture file not found");
      }
    }
    updatePayload.profilePictureFileId = fileId;
  }

  if (Object.keys(updatePayload).length > 0) {
    await db
      .update(users)
      .set({ ...updatePayload, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  return true;
};
