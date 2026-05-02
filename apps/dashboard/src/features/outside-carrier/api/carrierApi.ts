import type { MessageDto } from "@/config/apiMessages.ts";
import ApiClient from "@/libs/ApiClient.ts";
import type { ApiResponse } from "@/libs/api-types.ts";
import type {
  GetOutsideCarriersParams,
  OutsideCarrier,
  OutsideCarrierFormData,
  PaginatedOutsideCarriersResponse,
  UpdateOutsideCarrierRequest,
} from "../types/carrier.ts";

// Get outside carriers with pagination, sorting, and search
export const getOutsideCarriers = async (params?: GetOutsideCarriersParams) => {
  const queryParams: Record<string, string | number> = {};

  if (params?.page !== undefined) queryParams.page = params.page;
  if (params?.limit !== undefined) queryParams.limit = params.limit;
  if (params?.sortField) queryParams.sortField = params.sortField;
  if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
  if (params?.query) queryParams.query = params.query;

  const response = await ApiClient.get<ApiResponse<PaginatedOutsideCarriersResponse>>(
    "/outside-carriers",
    queryParams,
  );
  return response.data;
};

// Get outside carrier by ID
export const getOutsideCarrierById = async (id: string) => {
  const response = await ApiClient.get<ApiResponse<OutsideCarrier>>(`/outside-carriers/${id}`);
  return response.data;
};

// Create new outside carrier
export const createOutsideCarrier = async (data: OutsideCarrierFormData) => {
  const response = await ApiClient.post<ApiResponse<OutsideCarrier>>("/outside-carriers", data);
  return response.data;
};

// Update outside carrier
export const updateOutsideCarrier = async (data: UpdateOutsideCarrierRequest) => {
  const response = await ApiClient.put<ApiResponse<OutsideCarrier>>(
    `/outside-carriers/${data.id}`,
    data,
  );
  return response.data;
};

// Delete outside carrier
export const deleteOutsideCarrier = async (id: string) => {
  const response = await ApiClient.delete<ApiResponse<MessageDto>>(`/outside-carriers/${id}`);
  return response.data;
};
