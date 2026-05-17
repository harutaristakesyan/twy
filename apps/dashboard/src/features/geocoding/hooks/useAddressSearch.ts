import { keepPreviousData, useApiQuery } from "@/libs/query";
import { geocodingApi } from "../api/geocodingApi.ts";
import type { AddressSuggestion } from "../types/geocoding.ts";

const MIN_QUERY_LENGTH = 3;

export function useAddressSearch(query: string, limit = 5) {
  const trimmed = query.trim();
  return useApiQuery<AddressSuggestion[]>(
    ["geocode", "search", trimmed, limit],
    () => geocodingApi.searchAddress(trimmed, limit),
    {
      enabled: trimmed.length >= MIN_QUERY_LENGTH,
      placeholderData: keepPreviousData,
      staleTime: 5 * 60 * 1000,
    },
  );
}
