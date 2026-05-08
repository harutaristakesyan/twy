import ApiClient from "@/libs/ApiClient.ts";
import type { ApiResponse } from "@/libs/api-types.ts";
import type { InvoiceRecord, InvoiceStatus } from "../types/index.ts";

interface CreateInvoiceDto {
  loadId: string;
  type: "carrier" | "broker";
  amount: number;
  paymentTermDays: number;
  fileId?: string;
}

interface CreateInvoiceResponse {
  message: string;
  invoice: InvoiceRecord;
}

interface InvoiceListResponse {
  invoices: InvoiceRecord[];
}

export const invoiceApi = {
  createInvoice: async (data: CreateInvoiceDto): Promise<InvoiceRecord> => {
    const response = await ApiClient.post<ApiResponse<CreateInvoiceResponse>>("/invoices", data);
    return response.data.invoice;
  },

  listInvoices: async (params: { loadId: string }): Promise<InvoiceRecord[]> => {
    const response = await ApiClient.get<ApiResponse<InvoiceListResponse>>("/invoices", {
      loadId: params.loadId,
    });
    return response.data.invoices;
  },

  updateInvoiceStatus: async (id: string, status: InvoiceStatus): Promise<void> => {
    await ApiClient.patch<ApiResponse<{ message: string }>>(`/invoices/${id}/status`, { status });
  },

  deleteInvoice: async (id: string): Promise<void> => {
    await ApiClient.delete<ApiResponse<{ message: string }>>(`/invoices/${id}`);
  },
};
