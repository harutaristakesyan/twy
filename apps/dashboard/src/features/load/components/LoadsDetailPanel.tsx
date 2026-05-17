import { Spinner } from "@heroui/react";
import type React from "react";
import { useCallback } from "react";
import { loadApi } from "@/features/load/api/loadApi";
import { LoadDetailOverlayCard } from "@/features/load/components/LoadDetailOverlayCard";
import { LoadMap } from "@/features/load/components/LoadMap";
import { useSelectedLoadId } from "@/features/load/hooks/useSelectedLoadId";
import { keepPreviousData, queryKeys, useApiQuery, useQueryActions } from "@/libs/query";

export const LoadsDetailPanel: React.FC = () => {
  const loadId = useSelectedLoadId();
  const { invalidate } = useQueryActions();

  const { data: load, isFetching } = useApiQuery(
    queryKeys.loads.detail(loadId),
    () => {
      if (!loadId) return Promise.reject(new Error("No loadId"));
      return loadApi.getById(loadId);
    },
    { enabled: !!loadId, placeholderData: keepPreviousData },
  );

  const handleInvalidate = useCallback(() => {
    void invalidate(queryKeys.loads.all);
    if (loadId) void invalidate(queryKeys.loads.detail(loadId));
  }, [invalidate, loadId]);

  const showCard = !!loadId && !!load;

  return (
    <div className="relative isolate hidden h-full flex-1 lg:block">
      <LoadMap load={load ?? null} />
      <div className="pointer-events-none absolute inset-0 z-1000 p-4">
        {isFetching && loadId && !load && (
          <div className="pointer-events-auto inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow">
            <Spinner size="sm" />
            <span className="text-xs text-default-600">Loading load…</span>
          </div>
        )}
        {showCard && <LoadDetailOverlayCard load={load} onInvalidate={handleInvalidate} />}
      </div>
    </div>
  );
};
