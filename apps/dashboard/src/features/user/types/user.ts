export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
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

export interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  branch?: string | null;
  teamId?: string | null;
}

export interface UpdateUserRequest {
  id: string;
  branch?: string;
  teamId?: string | null;
  isActive?: boolean;
}

export interface SelfUpdateRequest {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  profilePictureFileId?: string | null;
}

export interface GetUsersParams {
  page?: number; // zero-indexed page number (default: 0)
  limit?: number; // number of users per page (default: 5)
  sortField?: "firstName" | "lastName" | "email" | "isActive" | "createdAt" | "branch" | undefined;
  sortOrder?: "ascend" | "descend" | undefined;
  query?: string; // search text for firstName, lastName, email
  filters?: string;
}

export interface PaginatedUsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
