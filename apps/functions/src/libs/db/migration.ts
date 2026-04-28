import path from "path";
import { promises as fs } from "fs";
import { Kysely, sql } from "kysely";
import { Database } from "./index.js";
const MIGRATION_LOG_TABLE = "_migration_log";

export const runMigrations = async (db: Kysely<Database>, folder: string) => {
  await db.schema
    .createTable(MIGRATION_LOG_TABLE)
    .ifNotExists()
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid
            ()`),
    )
    .addColumn("applied_at", "timestamp", (col) =>
      col.defaultTo(sql`now
            ()`),
    )
    .addColumn("filename", "varchar", (col) => col.notNull().unique())
    .execute();

  const files = (await fs.readdir(folder))
    .filter((f) => /^V\d+__.*\.sql$/.test(f))
    .sort();

  for (const file of files) {
    const rows = (await db
      .selectFrom(MIGRATION_LOG_TABLE)
      .select((eb) => eb.fn.countAll().as("count"))
      .where("filename", "=", file)
      .execute()) as { count: string }[];

    const row = rows[0] ?? { count: "0" };

    if (Number(row.count) > 0) {
      console.log(`⏭️ Skipping already applied: ${file}`);
      continue;
    }

    const sqlString = await fs.readFile(path.join(folder, file), "utf-8");

    const statements = sqlString
      .split(/;\s*$/gm)
      .map((stmt) => stmt.trim())
      .filter(Boolean);

    for (const statement of statements) {
      if (statement) {
        await sql.raw(statement).execute(db);
      }
    }
    console.log(`🚀 Applying: ${file}`);

    await db
      .insertInto(MIGRATION_LOG_TABLE)
      .values({ filename: file })
      .execute();
  }
};
