import type { QueryKey } from "@tanstack/react-query";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

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
