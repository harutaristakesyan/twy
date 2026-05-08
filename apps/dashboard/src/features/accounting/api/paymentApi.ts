import ApiClient from "@/libs/ApiClient.ts";
import type { ApiResponse } from "@/libs/api-types.ts";
import type { PaymentRecord } from "../types/index.ts";

interface RecordPaymentDto {
  invoiceId: string;
  amount: number;
  method?: string;
  reference?: string;
}

interface RecordPaymentResponse {
  message: string;
  payment: PaymentRecord;
}

interface PaymentListResponse {
  payments: PaymentRecord[];
}

export const paymentApi = {
  recordPayment: async (data: RecordPaymentDto): Promise<PaymentRecord> => {
    const response = await ApiClient.post<ApiResponse<RecordPaymentResponse>>("/payments", data);
    return response.data.payment;
  },

  listPaymentsForInvoice: async (invoiceId: string): Promise<PaymentRecord[]> => {
    const response = await ApiClient.get<ApiResponse<PaymentListResponse>>(
      `/invoices/${invoiceId}/payments`,
    );
    return response.data.payments;
  },
};
