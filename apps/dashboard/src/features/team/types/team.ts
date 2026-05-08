import type { PermissionsMap } from "@/utils/permissions";

export interface Team {
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
  teams: Team[];
  total: number;
}

export interface TeamFormData {
  name: string;
  description?: string;
  branchRestricted: boolean;
  onlyOwnData: boolean;
  permissions: PermissionsMap;
}

export interface GetTeamsParams {
  page?: number;
  limit?: number;
  sortOrder?: "ascend" | "descend";
  query?: string;
  filters?: string;
}

export interface TeamMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
}

export interface TeamMemberListResponse {
  items: TeamMember[];
  total: number;
}
