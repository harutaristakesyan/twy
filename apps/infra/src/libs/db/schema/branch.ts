import type { StrN, Timestamp } from "./types";

export interface BranchTable {
  id: string;
  name: string;
  contact: StrN;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
