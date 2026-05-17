export interface UserResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isActive: boolean;
  branch: UserBranchResponse | null;
  teamId: string | null;
  teamName: string | null;
  profilePictureFileId: string | null;
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
  phone: string | null;
  isActive: boolean;
  branch: UserBranchResponse | null;
  teamId: string | null;
  teamName: string | null;
  createdAt: string | null;
}

export interface UserListResponse {
  users: UserListItemResponse[];
  total: number;
}
