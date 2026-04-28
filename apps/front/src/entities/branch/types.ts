export interface Branch {
  id: string
  name: string
  contact: string | null
  owner: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
  createdAt?: string
  updatedAt?: string
}

export interface BranchFormData {
  name: string
  owner: string // Required: user ID
  contact?: string
}

export interface UpdateBranchRequest {
  id: string
  name?: string
  contact?: string
  owner: string // Required: user ID
}

export interface GetBranchesParams {
  page?: number // zero-indexed page number (default: 0)
  limit?: number // number of branches per page (default: 10)
  sortField?: 'name' | 'owner' | 'createdAt' | undefined
  sortOrder?: 'ascend' | 'descend' | undefined
  query?: string // search text for name, contact
}

export interface PaginatedBranchesResponse {
  branches: Branch[]
  total: number
}
