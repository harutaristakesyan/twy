import ApiClient from "@/shared/api/ApiClient.ts";
import type { ApiResponse } from "@/shared/api/types.ts";
import type {
  ChangeLoadStatusDto,
  CreateLoadDto,
  GetLoadsParams,
  PaginatedLoadsResponse,
  UpdateLoadDto,
} from "./types";

interface MessageResponse {
  message: string;
}

interface CreateLoadResponse extends MessageResponse {
  loadId: string;
}

interface ChangeStatusResponse extends MessageResponse {
  loadId: string;
  status: string;
  statusChangedBy: string | null;
}

export const loadApi = {
  getAll: async (params?: GetLoadsParams): Promise<PaginatedLoadsResponse> => {
    const response = await ApiClient.get<ApiResponse<PaginatedLoadsResponse>>("/loads", params);
    return response.data;
  },

  create: async (data: CreateLoadDto): Promise<CreateLoadResponse> => {
    const response = await ApiClient.post<ApiResponse<CreateLoadResponse>>("/loads", data);
    return response.data;
  },

  update: async (id: string, data: UpdateLoadDto): Promise<MessageResponse> => {
    const response = await ApiClient.put<ApiResponse<MessageResponse>>(`/loads/${id}`, data);
    return response.data;
  },

  changeStatus: async (id: string, payload: ChangeLoadStatusDto): Promise<ChangeStatusResponse> => {
    const response = await ApiClient.patch<ApiResponse<ChangeStatusResponse>>(
      `/loads/${id}/status`,
      payload,
    );
    return response.data;
  },

  delete: async (id: string): Promise<MessageResponse> => {
    const response = await ApiClient.delete<ApiResponse<MessageResponse>>(`/loads/${id}`);
    return response.data;
  },
};
