import { useApiQuery } from "@/libs/query";
import { geocodingApi } from "../api/geocodingApi.ts";
import type { RouteResult } from "../types/geocoding.ts";

export function useRoute(coordinates: Array<[number, number]>) {
  const enabled = coordinates.length >= 2;
  const key = coordinates.map(([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`).join(";");
  return useApiQuery<RouteResult>(
    ["geocode", "route", key],
    () => geocodingApi.getRoute(coordinates),
    {
      enabled,
      staleTime: 10 * 60 * 1000,
      retry: 0,
    },
  );
}
