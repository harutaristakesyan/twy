import { toast } from "@heroui/react";
import type { MutationOptions, QueryKey, UseQueryOptions } from "@tanstack/react-query";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";

export type { QueryKey };
export { keepPreviousData };

export function useApiQuery<TData>(
  key: QueryKey,
  fetcher: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<TData, Error>({
    queryKey: key,
    queryFn: fetcher,
    ...options,
  });
}

export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<MutationOptions<TData, Error, TVariables>, "mutationFn">,
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onError: (error) => {
      toast.danger(getErrorMessage(error));
    },
    ...options,
  });
}

/**
 * Centralized access to React Query cache invalidation. Use this instead of
 * importing `useQueryClient` directly — pairs naturally with `queryKeys` from
 * `./keys.ts`. Pass one or many keys to invalidate after a mutation.
 *
 * For "read this entity by id" flows, prefer `useApiQuery(queryKeys.X.detail(id), api.getById)`
 * over reading from the list cache.
 */
export function useQueryActions() {
  const queryClient = useQueryClient();
  return {
    invalidate: (...keys: QueryKey[]) =>
      Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: key }))),
  };
}

export type SortDescriptor = {
  column: string;
  direction: "ascending" | "descending";
};

export type ServerTableParams = {
  page: number;
  pageSize: number;
  sort?: SortDescriptor;
  filters?: Record<string, unknown>;
};

type UseServerTableOptions<TItem> = {
  queryKey: QueryKey;
  fetcher: (params: ServerTableParams) => Promise<{ items: TItem[]; total: number }>;
  initialPageSize?: number;
  initialFilters?: Record<string, unknown>;
};

export function useServerTable<TItem>({
  queryKey,
  fetcher,
  initialPageSize = 20,
  initialFilters,
}: UseServerTableOptions<TItem>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sort, setSort] = useState<SortDescriptor | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown> | undefined>(initialFilters);

  const params: ServerTableParams = { page, pageSize, sort, filters };

  const query = useQuery({
    queryKey: [...(queryKey as unknown[]), params],
    queryFn: () => fetcher(params),
    placeholderData: keepPreviousData,
  });

  return {
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    page,
    pageSize,
    sort,
    filters,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    setPage: (nextPage: number) => setPage(nextPage),
    setPageSize: (nextSize: number) => {
      setPageSize(nextSize);
      setPage(1);
    },
    setSort: (descriptor: SortDescriptor) => {
      setSort(descriptor);
      setPage(1);
    },
    setFilters: (nextFilters: Record<string, unknown>) => {
      setFilters(nextFilters);
      setPage(1);
    },
    refetch: query.refetch,
  };
}
