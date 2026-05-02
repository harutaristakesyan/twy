export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  teamId?: string | null;
  teamName?: string | null;
  registeredDate: string;
  createdAt?: string;
  branchId?: string;
  branchName?: string;
  branch?: {
    id: string;
    name: string;
  };
}

// Current user response from GET /user endpoint
export interface CurrentUser {
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  branch: {
    id: string;
    name: string;
  };
  registeredDate: string;
}

export interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  branch: string;
}

export interface UpdateUserRequest {
  id: string;
  branch?: string;
  isActive?: boolean;
}

export interface SelfUpdateRequest {
  firstName?: string;
  lastName?: string;
}

export interface GetUsersParams {
  page?: number; // zero-indexed page number (default: 0)
  limit?: number; // number of users per page (default: 5)
  sortField?: "firstName" | "lastName" | "email" | "isActive" | "createdAt" | "branch" | undefined;
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
