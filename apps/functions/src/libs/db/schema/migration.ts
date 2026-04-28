import { ColumnType } from "kysely";
import { Timestamp } from "./types.js";

export interface MigrationLogTable {
  id: ColumnType<number, number | undefined, number>;
  filename: string;
  appliedAt: Timestamp;
}
