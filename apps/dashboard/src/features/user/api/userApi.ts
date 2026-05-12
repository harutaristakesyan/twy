import type { MessageDto } from "@/config/apiMessages.ts";
import ApiClient from "@/libs/ApiClient.ts";
import type { ApiResponse } from "@/libs/api-types.ts";
import type {
  GetUsersParams,
  PaginatedUsersResponse,
  SelfUpdateRequest,
  UpdateUserRequest,
  User,
  UserFormData,
} from "../types/user.ts";

// Get users with pagination, sorting, and search
export const getUsers = async (params?: GetUsersParams) => {
  const queryParams: Record<string, string | number | boolean> = {};

  if (params?.page !== undefined) queryParams.page = params.page;
  if (params?.limit !== undefined) queryParams.limit = params.limit;
  if (params?.sortField) queryParams.sortField = params.sortField;
  if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
  if (params?.query) queryParams.query = params.query;
  if (params?.filters !== undefined) queryParams.filters = params.filters;

  const response = await ApiClient.get<ApiResponse<PaginatedUsersResponse>>("/users", queryParams);
  return response.data;
};

// Get user by ID
export const getUserById = async (id: string) => {
  const response = await ApiClient.get<ApiResponse<User>>(`/users/${id}`);
  return response.data;
};

// Create new user
export const createUser = async (data: UserFormData) => {
  const response = await ApiClient.post<ApiResponse<User>>("/users", data);
  return response.data;
};

// Update user (admin only)
export const updateUser = async (data: UpdateUserRequest) => {
  const response = await ApiClient.patch<ApiResponse<User>>(`/users/${data.id}`, data);
  return response.data;
};

// Self update (user can update their own profile)
export const selfUpdateUser = async (data: SelfUpdateRequest) => {
  const response = await ApiClient.patch<ApiResponse<MessageDto>>("/user", data);
  return response.data;
};

// Delete user
export const deleteUser = async (id: string) => {
  const response = await ApiClient.delete<ApiResponse<MessageDto>>(`/users/${id}`);
  return response.data;
};
