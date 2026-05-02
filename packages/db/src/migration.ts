import { migrate } from "drizzle-orm/aws-data-api/pg/migrator";
import type { DB } from "./client.js";

export const runMigrations = (db: DB, migrationsFolder: string) =>
  migrate(db, { migrationsFolder });
