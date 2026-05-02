import type { PermissionsMap } from "./contracts.js";

export interface TeamResponse {
  id: string;
  name: string;
  description: string | null;
  branchRestricted: boolean;
  onlyOwnData: boolean;
  permissions: PermissionsMap;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamListResponse {
  teams: TeamResponse[];
  total: number;
}
