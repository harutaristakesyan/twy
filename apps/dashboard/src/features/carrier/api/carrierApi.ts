import ApiClient from "@/libs/ApiClient.ts";
import type {
  Carrier,
  CarrierFormData,
  CarrierListResponse,
  GetCarriersParams,
  UpdateCarrierRequest,
} from "../types/carrier.ts";

export const getCarriers = async (params?: GetCarriersParams): Promise<CarrierListResponse> => {
  const queryParams: Record<string, string | number> = {};

  if (params?.kind) queryParams.kind = params.kind;
  if (params?.page !== undefined) queryParams.page = params.page;
  if (params?.limit !== undefined) queryParams.limit = params.limit;
  if (params?.sortField) queryParams.sortField = params.sortField;
  if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
  if (params?.query) queryParams.query = params.query;

  return ApiClient.get<CarrierListResponse>("/carriers", queryParams);
};

export const getCarrierById = async (id: string): Promise<Carrier> => {
  return ApiClient.get<Carrier>(`/carriers/${id}`);
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
