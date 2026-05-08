import type { MessageDto } from "@/config/apiMessages.ts";
import ApiClient from "@/libs/ApiClient.ts";
import type { ApiResponse } from "@/libs/api-types.ts";
import type {
  GetOutsideBrokersParams,
  OutsideBroker,
  PaginatedOutsideBrokersResponse,
  UpdateOutsideBrokerRequest,
} from "../types/broker.ts";

// Get outside brokers with pagination, sorting, and search
export const getOutsideBrokers = async (params?: GetOutsideBrokersParams) => {
  const queryParams: Record<string, string | number | boolean> = {};

  if (params?.page !== undefined) queryParams.page = params.page;
  if (params?.limit !== undefined) queryParams.limit = params.limit;
  if (params?.sortField) queryParams.sortField = params.sortField;
  if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
  if (params?.query) queryParams.query = params.query;
  if (params?.filters !== undefined) queryParams.filters = params.filters;

  const response = await ApiClient.get<ApiResponse<PaginatedOutsideBrokersResponse>>(
    "/outside-brokers",
    queryParams,
  );
  return response.data;
};

// Get outside broker by ID
export const getOutsideBrokerById = async (id: string) => {
  const response = await ApiClient.get<ApiResponse<OutsideBroker>>(`/outside-brokers/${id}`);
  return response.data;
};

// Update outside broker
export const updateOutsideBroker = async (data: UpdateOutsideBrokerRequest) => {
  const response = await ApiClient.put<ApiResponse<OutsideBroker>>(
    `/outside-brokers/${data.id}`,
    data,
  );
  return response.data;
};

// Delete outside broker
export const deleteOutsideBroker = async (id: string) => {
  const response = await ApiClient.delete<ApiResponse<MessageDto>>(`/outside-brokers/${id}`);
  return response.data;
};
