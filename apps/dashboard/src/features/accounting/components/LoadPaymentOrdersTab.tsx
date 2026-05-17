import { Plus } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { DataTable } from "@/components/DataTable";
import { Search } from "@/components/Search";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePermission } from "@/hooks/usePermission";
import { queryKeys, useServerTable } from "@/libs/query";
import { paymentOrderApi } from "../api/paymentOrderApi";
import type { PaymentOrder } from "../types/paymentOrder";
import { useLoadPaymentOrderColumns } from "./useLoadPaymentOrderColumns";

export default function LoadPaymentOrdersTab() {
  const navigate = useNavigate();
  const canCreate = usePermission("load_payment_order", "add");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const table = useServerTable<PaymentOrder>({
    queryKey: queryKeys.paymentOrders.list(debouncedSearch),
    fetcher: async ({ page, pageSize }) => {
      const res = await paymentOrderApi.list({
        page: page - 1,
        limit: pageSize,
        query: debouncedSearch || undefined,
      });
      return { items: res.paymentOrders, total: res.total };
    },
    initialPageSize: 20,
  });

  const rawColumns = useLoadPaymentOrderColumns(navigate);
  const columns = rawColumns.map((col) => ({
    id: col.key,
    label: col.label,
    isRowHeader: col.isRowHeader,
  }));
  const renderCell = (record: PaymentOrder, colId: string) => {
    const col = rawColumns.find((c) => c.key === colId);
    return col?.render(record);
  };

  const handleCreate = () => navigate("create-load-po");

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-base font-semibold">Load Payment Orders ({table.total})</h2>
        <div className="flex items-center gap-2">
          <Search query={search} onQueryChange={setSearch} placeholder="Search orders..." />
          {canCreate && (
            <Button variant="primary" onPress={handleCreate}>
              <Plus className="h-4 w-4" />
              Create
            </Button>
          )}
        </div>
      </div>

      <DataTable
        ariaLabel="Load Payment Orders table"
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
    </>
  );
}
