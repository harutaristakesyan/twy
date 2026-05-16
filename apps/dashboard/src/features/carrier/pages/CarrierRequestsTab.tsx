import type React from "react";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { DataTable } from "@/components/DataTable";
import { Search } from "@/components/Search";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useServerTable } from "@/hooks/useServerTable";
import { listCarrierRequests } from "../api/carrierRequestApi";
import { useCarrierRequestColumns } from "../components/useCarrierRequestColumns";
import type { CarrierRequest } from "../types/carrierRequest";

const CarrierRequestsTab: React.FC = () => {
  const navigate = useNavigate();
  const { permissions } = useCurrentUser();
  const canView = Boolean(permissions.carriers_requests?.view);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const table = useServerTable<CarrierRequest>({
    queryKey: ["carrier-requests", debouncedSearch],
    fetcher: async ({ page, pageSize }) => {
      const result = await listCarrierRequests({
        page: page - 1,
        limit: pageSize,
        query: debouncedSearch || undefined,
      });
      return { items: result.requests, total: result.total };
    },
    initialPageSize: 10,
  });

  const openRequest = (record: CarrierRequest) => navigate(record.id);

  const { columns, renderCell } = useCarrierRequestColumns({ canView, onView: openRequest });

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Carrier Requests ({table.total})</h2>
        <Search query={search} onQueryChange={setSearch} placeholder="Search requests..." />
      </div>

      <DataTable
        ariaLabel="Carrier requests"
        items={table.items}
        columns={columns}
        renderCell={renderCell}
        total={table.total}
        page={table.page}
        pageSize={table.pageSize}
        isLoading={table.isLoading}
        onPageChange={table.setPage}
      />

      <Outlet />
    </div>
  );
};

export default CarrierRequestsTab;
