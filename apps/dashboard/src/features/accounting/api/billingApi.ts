import ApiClient from "@/libs/ApiClient";
import type { ApiResponse } from "@/libs/api-types";
import type {
  ExternalBillingBranch,
  ExternalBillingLoad,
  InternalBillingBranch,
  InternalBillingLoad,
} from "../types/billing";

export const billingApi = {
  listExternalByBranch: async (): Promise<ExternalBillingBranch[]> => {
    const res = await ApiClient.get<ApiResponse<{ branches: ExternalBillingBranch[] }>>(
      "/billing/external/branches",
    );
    return res.data.branches;
  },

  listExternalLoads: async (branchId: string): Promise<ExternalBillingLoad[]> => {
    const res = await ApiClient.get<ApiResponse<{ loads: ExternalBillingLoad[] }>>(
      `/billing/external/branches/${branchId}/loads`,
    );
    return res.data.loads;
  },

  listInternalByBranch: async (): Promise<InternalBillingBranch[]> => {
    const res = await ApiClient.get<ApiResponse<{ branches: InternalBillingBranch[] }>>(
      "/billing/internal/branches",
    );
    return res.data.branches;
  },

  listInternalLoads: async (branchId: string): Promise<InternalBillingLoad[]> => {
    const res = await ApiClient.get<ApiResponse<{ loads: InternalBillingLoad[] }>>(
      `/billing/internal/branches/${branchId}/loads`,
    );
    return res.data.loads;
  },
};
