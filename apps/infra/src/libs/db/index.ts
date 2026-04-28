import { MigrationLogTable } from "@libs/db/schema/migration";
import type { BranchTable } from "./schema/index";
import { UserTable } from "@libs/db/schema/users";

export { getDb } from "./client";

export * from "./schema/index";

export interface Database {
  _migration_log: MigrationLogTable;
  branch: BranchTable;
  users: UserTable;
  // load: LoadTable;
}
