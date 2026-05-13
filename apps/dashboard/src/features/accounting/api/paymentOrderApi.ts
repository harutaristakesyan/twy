import ApiClient from "@/libs/ApiClient";
import type { ApiResponse } from "@/libs/api-types";
import { fileApi } from "@/libs/fileApi";
import type { PaginatedPaymentOrdersResponse, UpdatePaymentOrderDto } from "../types/paymentOrder";

export const paymentOrderApi = {
  list: async (params: {
    page?: number;
    limit?: number;
    query?: string;
    filters?: string;
  }): Promise<PaginatedPaymentOrdersResponse> => {
    const res = await ApiClient.get<ApiResponse<PaginatedPaymentOrdersResponse>>(
      "/payment-orders",
      params,
    );
    return res.data;
  },

  create: async (loadId: string): Promise<{ id: string; loadId: string }> => {
    const res = await ApiClient.post<ApiResponse<{ id: string; loadId: string }>>(
      "/payment-orders",
      { loadId },
    );
    return res.data;
  },

  update: async (paymentOrderId: string, dto: UpdatePaymentOrderDto): Promise<void> => {
    await ApiClient.patch<ApiResponse<{ message: string }>>(
      `/payment-orders/${paymentOrderId}`,
      dto,
    );
  },

  addInvoice: async (paymentOrderId: string, file: File): Promise<string> => {
    const fileId = await fileApi.uploadFile(file);
    await ApiClient.post<ApiResponse<{ message: string }>>(
      `/payment-orders/${paymentOrderId}/files`,
      { fileId },
    );
    return fileId;
  },

  removeInvoice: async (paymentOrderId: string, fileId: string): Promise<void> => {
    await ApiClient.delete<ApiResponse<{ message: string }>>(
      `/payment-orders/${paymentOrderId}/files/${fileId}`,
    );
  },

  downloadInvoice: (fileId: string, fileName: string) => fileApi.downloadFile(fileId, fileName),
};
