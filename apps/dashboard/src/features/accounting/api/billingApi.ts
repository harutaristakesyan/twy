import ApiClient from "@/libs/ApiClient.ts";
import type { ApiResponse } from "@/libs/api-types.ts";
import type { ExternalBillingRow, InternalBillingRow, TwyAccountingRow } from "../types/index.ts";

interface TwyAccountingParams {
  branchId?: string;
  page: number;
  limit: number;
  dateFrom?: string;
  dateTo?: string;
}

interface TwyAccountingResponse {
  rows: TwyAccountingRow[];
  total: number;
}

interface ExternalBillingParams {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface InternalBillingParams {
  branchId?: string;
  page: number;
  limit: number;
  dateFrom?: string;
  dateTo?: string;
}

interface InternalBillingResponse {
  rows: InternalBillingRow[];
  total: number;
}

export const billingApi = {
  getTwyAccounting: async (params: TwyAccountingParams): Promise<TwyAccountingResponse> => {
    const q: Record<string, string | number> = { page: params.page, limit: params.limit };
    if (params.branchId !== undefined) q.branchId = params.branchId;
    if (params.dateFrom !== undefined) q.dateFrom = params.dateFrom;
    if (params.dateTo !== undefined) q.dateTo = params.dateTo;
    const response = await ApiClient.get<ApiResponse<TwyAccountingResponse>>("/billing/twy", q);
    return response.data;
  },

  getExternalBilling: async (params: ExternalBillingParams): Promise<ExternalBillingRow[]> => {
    const q: Record<string, string | number> = {};
    if (params.branchId !== undefined) q.branchId = params.branchId;
    if (params.dateFrom !== undefined) q.dateFrom = params.dateFrom;
    if (params.dateTo !== undefined) q.dateTo = params.dateTo;
    const response = await ApiClient.get<ApiResponse<{ rows: ExternalBillingRow[] }>>(
      "/billing/external",
      q,
    );
    return response.data.rows;
  },

  getInternalBilling: async (params: InternalBillingParams): Promise<InternalBillingResponse> => {
    const q: Record<string, string | number> = { page: params.page, limit: params.limit };
    if (params.branchId !== undefined) q.branchId = params.branchId;
    if (params.dateFrom !== undefined) q.dateFrom = params.dateFrom;
    if (params.dateTo !== undefined) q.dateTo = params.dateTo;
    const response = await ApiClient.get<ApiResponse<InternalBillingResponse>>(
      "/billing/internal",
      q,
    );
    return response.data;
  },
};
