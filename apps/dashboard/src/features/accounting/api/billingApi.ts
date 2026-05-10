import ApiClient from "@/libs/ApiClient";
import type { ApiResponse } from "@/libs/api-types";
import type {
  ExternalBillingBranch,
  ExternalBillingLoad,
  InternalBillingBranch,
  InternalBillingLoad,
} from "../types/billing";

interface BillingParams {
  query?: string;
  filters?: string;
  [key: string]: string | undefined;
}

export const billingApi = {
  listExternalByBranch: async (params?: BillingParams): Promise<ExternalBillingBranch[]> => {
    const res = await ApiClient.get<ApiResponse<{ branches: ExternalBillingBranch[] }>>(
      "/billing/external/branches",
      params,
    );
    return res.data.branches;
  },

  listExternalLoads: async (
    branchId: string,
    params?: BillingParams,
  ): Promise<ExternalBillingLoad[]> => {
    const res = await ApiClient.get<ApiResponse<{ loads: ExternalBillingLoad[] }>>(
      `/billing/external/branches/${branchId}/loads`,
      params,
    );
    return res.data.loads;
  },

  listInternalByBranch: async (params?: BillingParams): Promise<InternalBillingBranch[]> => {
    const res = await ApiClient.get<ApiResponse<{ branches: InternalBillingBranch[] }>>(
      "/billing/internal/branches",
      params,
    );
    return res.data.branches;
  },

  listInternalLoads: async (
    branchId: string,
    params?: BillingParams,
  ): Promise<InternalBillingLoad[]> => {
    const res = await ApiClient.get<ApiResponse<{ loads: InternalBillingLoad[] }>>(
      `/billing/internal/branches/${branchId}/loads`,
      params,
    );
    return res.data.loads;
  },
};
