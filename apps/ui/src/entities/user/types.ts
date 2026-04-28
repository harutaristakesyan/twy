export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  role: UserRole;
  registeredDate: string;
  createdAt?: string; // New format from API
  branchId?: string; // For backward compatibility
  branchName?: string; // For backward compatibility
  branch?: {
    // New format from API
    id: string;
    name: string;
  };
}

// Current user response from GET /user endpoint
export interface CurrentUser {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  branch: {
    id: string;
    name: string;
  };
  registeredDate: string;
}

export enum UserRole {
  OWNER = "Owner",
  HEAD_OWNER = "Head Owner",
  HEAD_ACCOUNTANT = "Head Accountant",
  ACCOUNTANT = "Accountant",
  AGENT = "Agent",
  CARRIER = "Carrier",
}

export interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  role: UserRole;
  branch: string; // Branch ID
}

export interface UpdateUserRequest {
  id: string;
  branch?: string; // Branch ID
  role?: UserRole;
  isActive?: boolean;
}

export interface SelfUpdateRequest {
  firstName?: string;
  lastName?: string;
}

export interface GetUsersParams {
  page?: number; // zero-indexed page number (default: 0)
  limit?: number; // number of users per page (default: 5)
  sortField?:
    | "firstName"
    | "lastName"
    | "email"
    | "role"
    | "isActive"
    | "createdAt"
    | "branch"
    | undefined;
  sortOrder?: "ascend" | "descend" | undefined;
  query?: string; // search text for firstName, lastName, email
}

export interface PaginatedUsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.OWNER]: "Owner",
  [UserRole.HEAD_OWNER]: "Head Owner",
  [UserRole.HEAD_ACCOUNTANT]: "Head Accountant",
  [UserRole.ACCOUNTANT]: "Accountant",
  [UserRole.AGENT]: "Agent",
  [UserRole.CARRIER]: "Carrier",
};

// Role descriptions - commented out for now
// export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
//   [UserRole.OWNER]: 'Full access to the entire functionality within a specific branch',
//   [UserRole.HEAD_OWNER]: 'Full access across all branches',
//   [UserRole.HEAD_ACCOUNTANT]: 'Handles accounting across all branches',
//   [UserRole.ACCOUNTANT]: 'Handles accounting within the branch',
//   [UserRole.AGENT]: 'Reviews and manages loads posted by Carriers of that branch',
//   [UserRole.CARRIER]: 'Posts loads under their specific branch and can edit'
// }
