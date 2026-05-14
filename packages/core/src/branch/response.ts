export interface BranchOwnerResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface BranchCIResponse {
  id: string;
  ciNumber: string;
  validFrom: string;
  validTo: string | null;
}

export interface BranchResponse {
  id: string;
  name: string;
  contact: string | null;
  createdAt: string | null;
  owner: BranchOwnerResponse | null;
  ci: BranchCIResponse | null;
}

export interface BranchListResponse {
  branches: BranchResponse[];
  total: number;
}
