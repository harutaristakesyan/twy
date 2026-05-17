import type React from "react";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { DataTable } from "@/components/DataTable";
import { Search } from "@/components/Search";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { queryKeys, useServerTable } from "@/libs/query";
import { listBrokerRequests } from "../api/brokerRequestApi";
import { getBrokerRequestColumns } from "../components/BrokerRequestColumns";
import type { BrokerRequest } from "../types/brokerRequest";

const BrokerRequestsTab: React.FC = () => {
  const navigate = useNavigate();
  const { permissions } = useCurrentUser();
  const canView = Boolean(permissions.brokers_requests?.view);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const table = useServerTable<BrokerRequest>({
    queryKey: queryKeys.brokerRequests.list(debouncedSearch),
    fetcher: async ({ page, pageSize }) => {
      const result = await listBrokerRequests({
        page: page - 1,
        limit: pageSize,
        query: debouncedSearch || undefined,
      });
      return { items: result.requests, total: result.total };
    },
    initialPageSize: 10,
  });

  const openRequest = (record: BrokerRequest) => navigate(record.id);

  const { columns, renderCell } = getBrokerRequestColumns({ canView, onView: openRequest });

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Broker Requests ({table.total})</h2>
        <Search query={search} onQueryChange={setSearch} placeholder="Search requests..." />
      </div>

      <DataTable
        ariaLabel="Broker requests"
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

export default BrokerRequestsTab;
