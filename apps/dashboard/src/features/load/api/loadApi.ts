import ApiClient from "@/libs/ApiClient.ts";
import type { ApiResponse } from "@/libs/api-types.ts";
import type {
  AddCommentDto,
  ChangeLoadStatusDto,
  CreateLoadDto,
  GetLoadsParams,
  Load,
  LoadCommentsResponse,
  PaginatedLoadsResponse,
  UpdateLoadDto,
} from "../types/load";

interface MessageResponse {
  message: string;
}

interface CreateLoadResponse extends MessageResponse {
  loadId: string;
  referenceNumber: string;
}

interface ChangeStatusResponse extends MessageResponse {
  loadId: string;
  status: string;
}

export const loadApi = {
  getAll: async (params?: GetLoadsParams): Promise<PaginatedLoadsResponse> => {
    const response = await ApiClient.get<ApiResponse<PaginatedLoadsResponse>>("/loads", params);
    return response.data;
  },

  getById: async (id: string): Promise<Load> => {
    const response = await ApiClient.get<ApiResponse<Load>>(`/loads/${id}`);
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

  listComments: async (loadId: string): Promise<LoadCommentsResponse> => {
    const response = await ApiClient.get<ApiResponse<LoadCommentsResponse>>(
      `/loads/${loadId}/comments`,
    );
    return response.data;
  },

  addComment: async (
    loadId: string,
    data: AddCommentDto,
  ): Promise<{ message: string; commentId: string }> => {
    const response = await ApiClient.post<ApiResponse<{ message: string; commentId: string }>>(
      `/loads/${loadId}/comments`,
      data,
    );
    return response.data;
  },
};
