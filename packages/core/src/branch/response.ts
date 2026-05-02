export interface BranchResponse {
  id: string;
  name: string;
  contact: string | null;
  createdAt: string | null;
}

export interface BranchListResponse {
  branches: BranchResponse[];
  total: number;
}
