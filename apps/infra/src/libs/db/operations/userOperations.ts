import { getDb } from "@libs/db";
import { Insertable } from "kysely";
import { UserTable } from "@libs/db/schema/users";

const tableName = "users";
export type NewUser = Insertable<UserTable>;

export const createUser = async (input: NewUser): Promise<void> => {
  const db = await getDb();

  const now = new Date();

  await db
    .insertInto(tableName)
    .values({
      ...input,
      createdAt: now,
      updatedAt: now,
    })
    .execute();
};
