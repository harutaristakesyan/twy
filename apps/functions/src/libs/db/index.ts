import type { MigrationLogTable } from "@libs/db/schema/migration";
import type { UserTable } from "@libs/db/schema/users";
import type { BranchTable, FileTable, LoadFilesTable, LoadTable } from "./schema/index";

export { getDb } from "./client";

export * from "./schema/index";

export interface Database {
  _migration_log: MigrationLogTable;
  branch: BranchTable;
  users: UserTable;
  file: FileTable;
  load: LoadTable;
  load_files: LoadFilesTable;
}
