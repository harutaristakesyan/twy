import ApiClient from "@/libs/ApiClient";
import type { ApiResponse } from "@/libs/api-types";
import { fileApi } from "@/libs/fileApi";
import type {
  CreateOfficeExpenseDto,
  OfficeExpensePaymentOrder,
  PaginatedOfficeExpenseResponse,
  UpdateOfficeExpenseDto,
} from "../types/officeExpensePaymentOrder";

export const officeExpenseApi = {
  create: async (dto: CreateOfficeExpenseDto): Promise<OfficeExpensePaymentOrder> => {
    const res = await ApiClient.post<ApiResponse<OfficeExpensePaymentOrder>>(
      "/office-expense-payment-orders",
      dto,
    );
    return res.data;
  },

  list: async (params: {
    page?: number;
    limit?: number;
    query?: string;
    filters?: string;
  }): Promise<PaginatedOfficeExpenseResponse> => {
    const res = await ApiClient.get<ApiResponse<PaginatedOfficeExpenseResponse>>(
      "/office-expense-payment-orders",
      params,
    );
    return res.data;
  },

  update: async (id: string, dto: UpdateOfficeExpenseDto): Promise<void> => {
    await ApiClient.patch<ApiResponse<{ message: string }>>(
      `/office-expense-payment-orders/${id}`,
      dto,
    );
  },

  addFile: async (id: string, file: File): Promise<string> => {
    const fileId = await fileApi.uploadFile(file);
    await ApiClient.post<ApiResponse<{ message: string }>>(
      `/office-expense-payment-orders/${id}/files`,
      { fileId },
    );
    return fileId;
  },

  removeFile: async (id: string, fileId: string): Promise<void> => {
    await ApiClient.delete<ApiResponse<{ message: string }>>(
      `/office-expense-payment-orders/${id}/files/${fileId}`,
    );
  },

  downloadFile: (fileId: string, fileName: string) => fileApi.downloadFile(fileId, fileName),
};
