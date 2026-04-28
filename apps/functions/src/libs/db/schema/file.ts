import type { Timestamp } from "./types";

export interface FileTable {
  id: string;
  fileName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
