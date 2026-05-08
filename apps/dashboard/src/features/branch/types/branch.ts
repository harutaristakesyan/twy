export interface Branch {
  id: string;
  name: string;
  contact: string | null;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BranchFormData {
  name: string;
  owner?: string | null;
  contact?: string;
}

export interface UpdateBranchRequest {
  id: string;
  name?: string;
  contact?: string | null;
  owner?: string | null;
}

export interface GetBranchesParams {
  page?: number; // zero-indexed page number (default: 0)
  limit?: number; // number of branches per page (default: 10)
  sortField?: "name" | "createdAt" | "contact" | undefined;
  sortOrder?: "ascend" | "descend" | undefined;
  query?: string; // search text for name, contact
  filters?: string;
}

export interface PaginatedBranchesResponse {
  branches: Branch[];
  total: number;
}
