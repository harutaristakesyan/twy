import ApiClient from "@/libs/ApiClient.ts";
import type { ApiResponse } from "@/libs/api-types.ts";
import { shareInFlightPromise } from "@/utils/shareInFlightPromise.ts";
import type {
  CarrierRequestListResponse,
  ListCarrierRequestsParams,
  SubmitCarrierRequestBody,
} from "../types/carrierRequest.ts";

const carrierRequestsListInFlight = new Map<string, Promise<CarrierRequestListResponse>>();

function listCarrierRequestsKey(params?: ListCarrierRequestsParams): string {
  return JSON.stringify({
    page: params?.page ?? 0,
    limit: params?.limit ?? 10,
    sortField: params?.sortField ?? "",
    sortOrder: params?.sortOrder ?? "",
    status: params?.status ?? "",
    query: params?.query ?? "",
    filters: params?.filters ?? "",
  });
}

export const listCarrierRequests = async (
  params?: ListCarrierRequestsParams,
): Promise<CarrierRequestListResponse> => {
  return shareInFlightPromise(
    carrierRequestsListInFlight,
    listCarrierRequestsKey(params),
    async () => {
      const queryParams: Record<string, string | number | boolean> = {};
      if (params?.page !== undefined) queryParams.page = params.page;
      if (params?.limit !== undefined) queryParams.limit = params.limit;
      if (params?.sortField) queryParams.sortField = params.sortField;
      if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
      if (params?.status) queryParams.status = params.status;
      if (params?.query) queryParams.query = params.query;
      if (params?.filters !== undefined) queryParams.filters = params.filters;

      const response = await ApiClient.get<ApiResponse<CarrierRequestListResponse>>(
        "/carrier-requests",
        queryParams,
      );
      return response.data;
    },
  );
};

export const submitCarrierRequest = async (data: SubmitCarrierRequestBody): Promise<void> => {
  await ApiClient.post<unknown>("/carrier-requests", data);
};

export const approveCarrierRequest = async (requestId: string): Promise<void> => {
  await ApiClient.post<unknown>(`/carrier-requests/${requestId}/approve`, {});
};

export const rejectCarrierRequest = async (
  requestId: string,
  body: { rejectionReason?: string },
): Promise<void> => {
  await ApiClient.post<unknown>(`/carrier-requests/${requestId}/reject`, body);
};
