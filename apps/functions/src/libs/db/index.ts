import { MigrationLogTable } from "@libs/db/schema/migration";
import {
  BranchTable,
  FileTable,
  LoadFilesTable,
  LoadTable,
} from "./schema/index";
import { UserTable } from "@libs/db/schema/users";

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
