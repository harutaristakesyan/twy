import { Database, OrderDirection, Roles, getDb } from "@libs/db";
import createError from "http-errors";
import { Kysely, Transaction } from "kysely";

const USER_TABLE = "users";
const BRANCH_TABLE = "branch";

type Executor = Kysely<Database> | Transaction<Database>;

interface UserRow {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  isActive: boolean;
  branchId: string | null;
  branchName: string | null;
  createdAt: Date | null;
}

const mapUserDetails = (row: UserRow) => ({
  email: row.email,
  firstName: row.firstName,
  lastName: row.lastName,
  role: row.role,
  isActive: row.isActive,
  branch: row.branchId
    ? {
        id: row.branchId,
        name: row.branchName,
      }
    : null,
  createdAt: row.createdAt ? row.createdAt.toISOString() : null,
});

const mapUserListItem = (row: UserRow) => ({
  id: row.id,
  ...mapUserDetails(row),
});

const ensureBranchExists = async (
  db: Executor,
  branchId: string,
): Promise<void> => {
  const branch = await db
    .selectFrom(BRANCH_TABLE)
    .select(["id"])
    .where("id", "=", branchId)
    .executeTakeFirst();

  if (!branch) {
    throw new createError.NotFound("Branch not found");
  }
};

export const getFullUserInfoById = async (userId: string) => {
  const db = await getDb();

  const result = await db
    .selectFrom(USER_TABLE)
    .leftJoin(BRANCH_TABLE, `${USER_TABLE}.branch`, `${BRANCH_TABLE}.id`)
    .select([
      `${USER_TABLE}.id as id`,
      `${USER_TABLE}.email as email`,
      `${USER_TABLE}.lastName as lastName`,
      `${USER_TABLE}.firstName as firstName`,
      `${USER_TABLE}.role as role`,
      `${USER_TABLE}.isActive as isActive`,
      `${USER_TABLE}.branch as branchId`,
      `${BRANCH_TABLE}.name as branchName`,
      `${USER_TABLE}.createdAt as createdAt`,
    ])
    .where("users.id", "=", userId)
    .executeTakeFirst();

  if (!result) {
    throw new createError.NotFound("User not found");
  }

  return mapUserDetails(result as UserRow);
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

export const listUsers = async (input: ListUsersInput) => {
  const db = await getDb();

  let queryBuilder = db
    .selectFrom(USER_TABLE)
    .leftJoin(BRANCH_TABLE, `${USER_TABLE}.branch`, `${BRANCH_TABLE}.id`)
    .select([
      `${USER_TABLE}.id as id`,
      `${USER_TABLE}.email as email`,
      `${USER_TABLE}.firstName as firstName`,
      `${USER_TABLE}.lastName as lastName`,
      `${USER_TABLE}.role as role`,
      `${USER_TABLE}.isActive as isActive`,
      `${USER_TABLE}.branch as branchId`,
      `${BRANCH_TABLE}.name as branchName`,
      `${USER_TABLE}.createdAt as createdAt`,
    ]);

  let countQuery = db
    .selectFrom(USER_TABLE)
    .select(db.fn.count<number>("id").as("count"));

  if (input.query) {
    queryBuilder = queryBuilder.where((qb) =>
      qb.or([
        qb(`${USER_TABLE}.firstName`, "like", `%${input.query}%`),
        qb(`${USER_TABLE}.lastName`, "like", `%${input.query}%`),
        qb(`${USER_TABLE}.email`, "like", `%${input.query}%`),
      ]),
    );

    countQuery = countQuery.where((qb) =>
      qb.or([
        qb(`${USER_TABLE}.firstName`, "like", `%${input.query}%`),
        qb(`${USER_TABLE}.lastName`, "like", `%${input.query}%`),
        qb(`${USER_TABLE}.email`, "like", `%${input.query}%`),
      ]),
    );
  }

  queryBuilder = queryBuilder.orderBy(input.sortField, input.sortOrder);

  const offset = input.page * input.limit;
  queryBuilder = queryBuilder.limit(input.limit).offset(offset);

  const [rows, count] = await Promise.all([
    queryBuilder.execute(),
    countQuery.executeTakeFirst(),
  ]);

  const totalCount = count?.count ?? 0;
  const total = Number(totalCount);

  return {
    users: rows.map((row) => mapUserListItem(row as unknown as UserRow)),
    total: Number.isNaN(total) ? 0 : total,
  };
};

export interface UpdateUserInput {
  branchId?: string | null;
  role?: Roles | null;
  isActive?: boolean;
}

export const updateUser = async (
  userId: string,
  input: UpdateUserInput,
): Promise<boolean> => {
  const db = await getDb();

  return db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom(USER_TABLE)
      .select(["id"])
      .where("id", "=", userId)
      .executeTakeFirst();

    if (!existing) {
      return false;
    }

    const updatePayload: Record<string, unknown> = {};

    if (Object.prototype.hasOwnProperty.call(input, "branchId")) {
      const branchId = input.branchId ?? null;

      if (branchId) {
        await ensureBranchExists(trx, branchId);
      }

      updatePayload.branch = branchId;
    }

    if (Object.prototype.hasOwnProperty.call(input, "role")) {
      updatePayload.role = input.role ?? null;
    }

    if (typeof input.isActive !== "undefined") {
      updatePayload.isActive = input.isActive;
    }

    if (Object.keys(updatePayload).length > 0) {
      await trx
        .updateTable(USER_TABLE)
        .set({
          ...updatePayload,
          updatedAt: new Date(),
        })
        .where("id", "=", userId)
        .execute();
    }

    return true;
  });
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  const db = await getDb();

  return db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom(USER_TABLE)
      .select(["id"])
      .where("id", "=", userId)
      .executeTakeFirst();

    if (!existing) {
      return false;
    }

    await trx.deleteFrom(USER_TABLE).where("id", "=", userId).execute();

    return true;
  });
};

export interface SelfUpdateUserInput {
  firstName?: string;
  lastName?: string;
}

export const updateSelfUser = async (
  userId: string,
  input: SelfUpdateUserInput,
): Promise<boolean> => {
  const db = await getDb();

  const existing = await db
    .selectFrom(USER_TABLE)
    .select(["id"])
    .where("id", "=", userId)
    .executeTakeFirst();

  if (!existing) {
    return false;
  }

  const updatePayload: Record<string, string> = {};

  if (typeof input.firstName !== "undefined") {
    updatePayload.firstName = input.firstName;
  }

  if (typeof input.lastName !== "undefined") {
    updatePayload.lastName = input.lastName;
  }

  if (Object.keys(updatePayload).length > 0) {
    await db
      .updateTable(USER_TABLE)
      .set({
        ...updatePayload,
        updatedAt: new Date(),
      })
      .where("id", "=", userId)
      .execute();
  }

  return true;
};
