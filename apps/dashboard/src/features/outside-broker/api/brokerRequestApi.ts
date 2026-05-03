import ApiClient from "@/libs/ApiClient.ts";
import type { ApiResponse } from "@/libs/api-types.ts";
import { shareInFlightPromise } from "@/utils/shareInFlightPromise.ts";
import type {
  BrokerRequestListResponse,
  ListBrokerRequestsParams,
  SubmitBrokerRequestBody,
} from "../types/brokerRequest.ts";

const brokerRequestsListInFlight = new Map<string, Promise<BrokerRequestListResponse>>();

function listBrokerRequestsKey(params?: ListBrokerRequestsParams): string {
  return JSON.stringify({
    page: params?.page ?? 0,
    limit: params?.limit ?? 10,
    sortField: params?.sortField ?? "",
    sortOrder: params?.sortOrder ?? "",
    status: params?.status ?? "",
    query: params?.query ?? "",
  });
}

export const listBrokerRequests = async (
  params?: ListBrokerRequestsParams,
): Promise<BrokerRequestListResponse> => {
  return shareInFlightPromise(
    brokerRequestsListInFlight,
    listBrokerRequestsKey(params),
    async () => {
      const queryParams: Record<string, string | number> = {};
      if (params?.page !== undefined) queryParams.page = params.page;
      if (params?.limit !== undefined) queryParams.limit = params.limit;
      if (params?.sortField) queryParams.sortField = params.sortField;
      if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
      if (params?.status) queryParams.status = params.status;
      if (params?.query) queryParams.query = params.query;

      const response = await ApiClient.get<ApiResponse<BrokerRequestListResponse>>(
        "/broker-requests",
        queryParams,
      );
      return response.data;
    },
  );
};

export const submitBrokerRequest = async (data: SubmitBrokerRequestBody): Promise<void> => {
  await ApiClient.post<unknown>("/broker-requests", data);
};

export const approveBrokerRequest = async (requestId: string): Promise<void> => {
  await ApiClient.post<unknown>(`/broker-requests/${requestId}/approve`, {});
};

export const rejectBrokerRequest = async (
  requestId: string,
  body: { rejectionReason?: string },
): Promise<void> => {
  await ApiClient.post<unknown>(`/broker-requests/${requestId}/reject`, body);
};
