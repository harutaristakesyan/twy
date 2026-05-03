import ApiClient from "@/libs/ApiClient.ts";
import type {
  CarrierRequestListResponse,
  ListCarrierRequestsParams,
  SubmitCarrierRequestBody,
} from "../types/carrierRequest.ts";

export const listCarrierRequests = async (
  params?: ListCarrierRequestsParams,
): Promise<CarrierRequestListResponse> => {
  const queryParams: Record<string, string | number> = {};
  if (params?.page !== undefined) queryParams.page = params.page;
  if (params?.limit !== undefined) queryParams.limit = params.limit;
  if (params?.sortField) queryParams.sortField = params.sortField;
  if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
  if (params?.status) queryParams.status = params.status;
  if (params?.query) queryParams.query = params.query;

  return ApiClient.get<CarrierRequestListResponse>("/carrier-requests", queryParams);
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
