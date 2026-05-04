export interface BranchOwnerResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface BranchResponse {
  id: string;
  name: string;
  contact: string | null;
  createdAt: string | null;
  owner: BranchOwnerResponse | null;
}

export interface BranchListResponse {
  branches: BranchResponse[];
  total: number;
}
