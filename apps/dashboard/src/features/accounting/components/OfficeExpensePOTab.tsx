import { Plus } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { DataTable } from "@/components/DataTable";
import { Search } from "@/components/Search";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePermission } from "@/hooks/usePermission";
import { useServerTable } from "@/hooks/useServerTable";
import { officeExpenseApi } from "../api/officeExpensePaymentOrderApi";
import type { OfficeExpensePaymentOrder } from "../types/officeExpensePaymentOrder";
import { useOfficeExpenseColumns } from "./useOfficeExpenseColumns";

export default function OfficeExpensePOTab() {
  const navigate = useNavigate();
  const canCreate = usePermission("office_expense_payment_order", "add");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const table = useServerTable<OfficeExpensePaymentOrder>({
    queryKey: ["office-expense-orders", debouncedSearch],
    fetcher: async ({ page, pageSize }) => {
      const res = await officeExpenseApi.list({
        page: page - 1,
        limit: pageSize,
        query: debouncedSearch || undefined,
      });
      return { items: res.orders, total: res.total };
    },
    initialPageSize: 20,
  });

  const handleCreate = () => navigate("create-office-po");

  const rawColumns = useOfficeExpenseColumns(navigate);
  const columns = rawColumns.map((col) => ({
    id: col.key,
    label: col.label,
    isRowHeader: col.isRowHeader,
  }));
  const renderCell = (record: OfficeExpensePaymentOrder, colId: string) => {
    const col = rawColumns.find((c) => c.key === colId);
    return col?.render(record);
  };

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-base font-semibold">Office Expense Payment Orders ({table.total})</h2>
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
        ariaLabel="Office Expense Payment Orders table"
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
