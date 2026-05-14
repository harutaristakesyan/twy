import type { MessageDto } from "@/config/apiMessages.ts";
import ApiClient from "@/libs/ApiClient.ts";
import type { ApiResponse } from "@/libs/api-types.ts";
import type {
  CommunityLicense,
  CreateCIFormData,
  GetCommunityLicensesParams,
  PaginatedCIResponse,
  UpdateCIRequest,
} from "../types/communityLicense.ts";

export const getCommunityLicenses = async (params?: GetCommunityLicensesParams) => {
  const queryParams: Record<string, string | number> = {};
  if (params?.page !== undefined) queryParams.page = params.page;
  if (params?.limit !== undefined) queryParams.limit = params.limit;
  if (params?.sortField) queryParams.sortField = params.sortField;
  if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
  if (params?.query) queryParams.query = params.query;

  const response = await ApiClient.get<ApiResponse<PaginatedCIResponse>>(
    "/community-licenses",
    queryParams,
  );
  return response.data;
};

export const getCommunityLicenseById = async (id: string) => {
  const response = await ApiClient.get<ApiResponse<CommunityLicense>>(`/community-licenses/${id}`);
  return response.data;
};

export const createCommunityLicense = async (data: CreateCIFormData) => {
  const response = await ApiClient.post<ApiResponse<CommunityLicense>>("/community-licenses", data);
  return response.data;
};

export const updateCommunityLicense = async (data: UpdateCIRequest) => {
  const response = await ApiClient.put<ApiResponse<CommunityLicense>>(
    `/community-licenses/${data.id}`,
    data,
  );
  return response.data;
};

export const deleteCommunityLicense = async (id: string) => {
  const response = await ApiClient.delete<ApiResponse<MessageDto>>(`/community-licenses/${id}`);
  return response.data;
};
