import type {
  Branch,
  BranchFormData,
  GetBranchesParams,
  PaginatedBranchesResponse,
  UpdateBranchRequest,
} from "@/entities/branch/types.ts";
import ApiClient from "@/shared/api/ApiClient.ts";
import type { ApiResponse } from "@/shared/api/types.ts";
import type { MessageDto } from "@/shared/constants/request.ts";

// Get branches with pagination, sorting, and search
export const getBranches = async (params?: GetBranchesParams) => {
  const queryParams: Record<string, string | number> = {};

  if (params?.page !== undefined) queryParams.page = params.page;
  if (params?.limit !== undefined) queryParams.limit = params.limit;
  if (params?.sortField) queryParams.sortField = params.sortField;
  if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
  if (params?.query) queryParams.query = params.query;

  const response = await ApiClient.get<ApiResponse<PaginatedBranchesResponse>>(
    "/branches",
    queryParams,
  );
  return response.data;
};

// Get branch by ID
export const getBranchById = async (id: string) => {
  const response = await ApiClient.get<ApiResponse<Branch>>(`/branches/${id}`);
  return response.data;
};

// Create new branch
export const createBranch = async (data: BranchFormData) => {
  const response = await ApiClient.post<ApiResponse<Branch>>("/branches", data);
  return response.data;
};

// Update branch
export const updateBranch = async (data: UpdateBranchRequest) => {
  const response = await ApiClient.put<ApiResponse<Branch>>(`/branches/${data.id}`, data);
  return response.data;
};

// Delete branch
export const deleteBranch = async (id: string) => {
  const response = await ApiClient.delete<ApiResponse<MessageDto>>(`/branches/${id}`);
  return response.data;
};
