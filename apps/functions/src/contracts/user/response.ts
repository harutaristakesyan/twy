export interface UserResponse {
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  isActive: boolean;
  branch: UserBranchResponse | null;
  createdAt: string | null;
}

export interface UserBranchResponse {
  id: string;
  name: string | null;
}

export interface UserListItemResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  isActive: boolean;
  branch: UserBranchResponse | null;
  createdAt: string | null;
}

export interface UserListResponse {
  users: UserListItemResponse[];
  total: number;
}
