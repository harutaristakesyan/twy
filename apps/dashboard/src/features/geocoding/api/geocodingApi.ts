import ApiClient from "@/libs/ApiClient.ts";
import type { ApiResponse } from "@/libs/api-types.ts";
import type { RouteResult, SearchAddressResponse } from "../types/geocoding.ts";

export const geocodingApi = {
  searchAddress: async (q: string, limit = 5) => {
    const response = await ApiClient.get<ApiResponse<SearchAddressResponse>>("/geocode/search", {
      q,
      limit,
    });
    return response.data.results;
  },
  getRoute: async (coordinates: Array<[number, number]>) => {
    const response = await ApiClient.post<ApiResponse<RouteResult>>("/geocode/route", {
      coordinates,
    });
    return response.data;
  },
};
