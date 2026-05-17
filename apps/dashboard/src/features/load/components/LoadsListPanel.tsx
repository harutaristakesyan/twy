import { Plus } from "@gravity-ui/icons";
import { Button, ListBox, ScrollShadow, Spinner } from "@heroui/react";
import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Filter, FilterField } from "@/components/Search";
import { ActiveFilters, Search } from "@/components/Search";
import { loadApi } from "@/features/load/api/loadApi";
import { LoadCard } from "@/features/load/components/LoadCard";
import { useSelectedLoadId } from "@/features/load/hooks/useSelectedLoadId";
import type { Load, LoadStatus } from "@/features/load/types/load";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { queryKeys, useApiQuery } from "@/libs/query";

const STATUS_VALUES: LoadStatus[] = ["Pending", "Approved", "Delivered", "Hold", "Declined"];

const FILTER_FIELDS: FilterField[] = [
  {
    key: "status",
    label: "Status",
    type: "multiSelect",
    options: STATUS_VALUES.map((s) => ({ label: s, value: s })),
  },
];

export const LoadsListPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user, permissions } = useCurrentUser();
  const isBranchAssigned = user?.branch?.id !== undefined && user?.branch?.id !== null;
  const canAdd = Boolean(permissions.loads?.add);

  const selectedLoadId = useSelectedLoadId();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [activeFilter, setActiveFilter] = useState<Filter | undefined>();

  const { data, isLoading } = useApiQuery(
    queryKeys.loads.list({ q: debouncedSearch, filter: activeFilter }),
    () =>
      loadApi.getAll({
        page: 0,
        limit: 50,
        query: debouncedSearch || undefined,
        filters: activeFilter ? JSON.stringify(activeFilter) : undefined,
      }),
  );

  const loads: Load[] = data?.loads ?? [];
  const total = data?.total ?? 0;

  const handleSelect = (loadId: string) => navigate(`/loads/${loadId}`);

  return (
    <div className="flex h-full w-full flex-col gap-3 border-default-200 bg-white p-4 lg:w-125 lg:border-r">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Tracking loads</h2>
        <span className="text-xs text-default-500">{total}</span>
      </div>

      <Search
        query={search}
        onQueryChange={setSearch}
        placeholder="Search loads..."
        fields={FILTER_FIELDS}
        filter={activeFilter}
        onFilterChange={setActiveFilter}
      />
      <ActiveFilters filter={activeFilter} fields={FILTER_FIELDS} onChange={setActiveFilter} />

      <ScrollShadow className="-mx-1 flex-1 px-1">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="md" />
          </div>
        ) : loads.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium">No loads yet</p>
            <p className="text-xs text-default-500">Try a different search or filter.</p>
          </div>
        ) : (
          <ListBox
            aria-label="Loads"
            selectionMode="single"
            selectedKeys={selectedLoadId ? [selectedLoadId] : []}
            onSelectionChange={(keys) => {
              const next = Array.from(keys as Set<string>)[0];
              if (next) handleSelect(next);
            }}
            className="flex flex-col gap-2 border-none bg-transparent p-0"
          >
            {loads.map((load) => (
              <ListBox.Item
                key={load.id}
                id={load.id}
                textValue={load.referenceNumber}
                className="cursor-pointer rounded-xl p-0 data-focused:bg-transparent"
              >
                <LoadCard load={load} isSelected={selectedLoadId === load.id} />
              </ListBox.Item>
            ))}
          </ListBox>
        )}
      </ScrollShadow>

      {canAdd && (
        <Button
          variant="primary"
          isDisabled={!isBranchAssigned}
          onPress={() => navigate("/loads/create")}
          className="w-full"
        >
          <Plus className="h-4 w-4" />
          Add load
        </Button>
      )}
    </div>
  );
};
