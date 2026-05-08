import ApiClient from "@/libs/ApiClient.ts";
import type { ApiResponse } from "@/libs/api-types.ts";
import { shareInFlightPromise } from "@/utils/shareInFlightPromise.ts";
import type {
  Carrier,
  CarrierFormData,
  CarrierListResponse,
  GetCarriersParams,
  UpdateCarrierRequest,
} from "../types/carrier.ts";

const carriersListInFlight = new Map<string, Promise<CarrierListResponse>>();

function carriersListKey(params?: GetCarriersParams): string {
  return JSON.stringify({
    kind: params?.kind ?? "",
    page: params?.page ?? 0,
    limit: params?.limit ?? 10,
    sortField: params?.sortField ?? "",
    sortOrder: params?.sortOrder ?? "",
    query: params?.query ?? "",
    filters: params?.filters ?? "",
  });
}

export const getCarriers = async (params?: GetCarriersParams): Promise<CarrierListResponse> => {
  return shareInFlightPromise(carriersListInFlight, carriersListKey(params), async () => {
    const queryParams: Record<string, string | number | boolean> = {};

    if (params?.kind) queryParams.kind = params.kind;
    if (params?.page !== undefined) queryParams.page = params.page;
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.sortField) queryParams.sortField = params.sortField;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
    if (params?.query) queryParams.query = params.query;
    if (params?.filters !== undefined) queryParams.filters = params.filters;

    const response = await ApiClient.get<ApiResponse<CarrierListResponse>>(
      "/carriers",
      queryParams,
    );
    return response.data;
  });
};

export const getCarrierById = async (id: string): Promise<Carrier> => {
  const response = await ApiClient.get<ApiResponse<Carrier>>(`/carriers/${id}`);
  return response.data;
};

export const createCarrier = async (data: CarrierFormData): Promise<void> => {
  await ApiClient.post<unknown>("/carriers", data);
};

export const updateCarrier = async (data: UpdateCarrierRequest): Promise<void> => {
  await ApiClient.put<unknown>(`/carriers/${data.id}`, data);
};

export const deleteCarrier = async (id: string): Promise<void> => {
  await ApiClient.delete<unknown>(`/carriers/${id}`);
};
