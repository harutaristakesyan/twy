import ApiClient from "@/libs/ApiClient";
import { fileApi } from "@/libs/fileApi";
import type { PaginatedPaymentOrdersResponse, UpdatePaymentOrderDto } from "../types/paymentOrder";

export const paymentOrderApi = {
  list: (params: { page?: number; limit?: number }) =>
    ApiClient.get<PaginatedPaymentOrdersResponse>("/api/payment-orders", params),

  update: (paymentOrderId: string, dto: UpdatePaymentOrderDto) =>
    ApiClient.patch<{ message: string }>(`/api/payment-orders/${paymentOrderId}`, dto),

  addInvoice: async (paymentOrderId: string, file: File): Promise<void> => {
    const fileId = await fileApi.uploadFile(file);
    await ApiClient.post<{ message: string }>(`/api/payment-orders/${paymentOrderId}/files`, {
      fileId,
    });
  },

  removeInvoice: (paymentOrderId: string, fileId: string) =>
    ApiClient.delete<{ message: string }>(`/api/payment-orders/${paymentOrderId}/files/${fileId}`),

  downloadInvoice: (fileId: string, fileName: string) => fileApi.downloadFile(fileId, fileName),
};
