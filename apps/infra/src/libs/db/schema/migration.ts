import type { ColumnType } from "kysely";
import type { Timestamp } from "./types.js";

export interface MigrationLogTable {
  id: ColumnType<number, number | undefined, number>;
  filename: string;
  appliedAt: Timestamp;
}
