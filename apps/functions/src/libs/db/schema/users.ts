import type { StrN, Timestamp } from "./types.js";

export interface UserTable {
  id: string;
  email: string;
  firstName: StrN;
  lastName: StrN;
  role: StrN;
  isActive: boolean;
  branch: StrN;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
