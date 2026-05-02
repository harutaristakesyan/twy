import { asc, count, desc, eq, ilike, or } from "drizzle-orm";
import createError from "http-errors";
import { db } from "../client.js";
import { branch, type NewUser, type OrderDirection, type Roles, users } from "../schema/index.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export const createUser = async (input: NewUser): Promise<void> => {
  await db.insert(users).values(input);
};

interface UserDetailsRow {
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  isActive: boolean;
  branchId: string | null;
  branchName: string | null;
  createdAt: Date | null;
}

const mapUserDetails = (row: UserDetailsRow) => ({
  email: row.email,
  firstName: row.firstName,
  lastName: row.lastName,
  role: row.role,
  isActive: row.isActive,
  branch: row.branchId ? { id: row.branchId, name: row.branchName } : null,
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

export const getFullUserInfoById = async (userId: string) => {
  const [row] = await db
    .select({
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      branchId: users.branch,
      branchName: branch.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(branch, eq(users.branch, branch.id))
    .where(eq(users.id, userId));

  if (!row) {
    throw new createError.NotFound("User not found");
  }

  return mapUserDetails(row);
};

export interface ListUsersInput {
  page: number;
  limit: number;
  sortField:
    | "users.firstName"
    | "users.lastName"
    | "users.email"
    | "users.role"
    | "users.isActive"
    | "users.createdAt"
    | "branch.name";
  sortOrder: OrderDirection;
  query?: string;
}

const userSortColumn = (field: ListUsersInput["sortField"]) => {
  switch (field) {
    case "users.firstName":
      return users.firstName;
    case "users.lastName":
      return users.lastName;
    case "users.email":
      return users.email;
    case "users.role":
      return users.role;
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

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        branchId: users.branch,
        branchName: branch.name,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(branch, eq(users.branch, branch.id))
      .where(searchClause)
      .orderBy(direction(orderColumn))
      .limit(input.limit)
      .offset(offset),
    db.select({ value: count() }).from(users).where(searchClause),
  ]);

  return {
    users: rows.map((row) => ({ id: row.id, ...mapUserDetails(row) })),
    total: Number(totalRows[0]?.value ?? 0),
  };
};

export interface UpdateUserInput {
  branchId?: string | null;
  role?: Roles | null;
  isActive?: boolean;
}

export const updateUser = async (userId: string, input: UpdateUserInput): Promise<boolean> =>
  db.transaction(async (tx) => {
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

    if (Object.hasOwn(input, "role")) {
      updatePayload.role = input.role ?? null;
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

export const deleteUser = async (userId: string): Promise<boolean> =>
  db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId));

    if (!existing) {
      return false;
    }

    await tx.delete(users).where(eq(users.id, userId));

    return true;
  });

export interface SelfUpdateUserInput {
  firstName?: string;
  lastName?: string;
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

  if (Object.keys(updatePayload).length > 0) {
    await db
      .update(users)
      .set({ ...updatePayload, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  return true;
};
