import { Plus } from "@gravity-ui/icons";
import { Button, Label, SearchField, Spinner, Table } from "@heroui/react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageControls from "@/components/PageControls";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePermission } from "@/hooks/usePermission";
import { useServerTable } from "@/hooks/useServerTable";
import { officeExpenseApi } from "../api/officeExpensePaymentOrderApi";
import type { OfficeExpensePaymentOrder } from "../types/officeExpensePaymentOrder";
import OfficeExpensePaymentOrderDetailModal from "./OfficeExpensePaymentOrderDetailModal";
import { useOfficeExpenseColumns } from "./useOfficeExpenseColumns";

export default function OfficeExpensePOTab() {
  const navigate = useNavigate();
  const canCreate = usePermission("office_expense_payment_order", "add");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [detailOrder, setDetailOrder] = useState<OfficeExpensePaymentOrder | null>(null);
  const [detailMode, setDetailMode] = useState<"view" | "edit">("view");
  const [detailOpen, setDetailOpen] = useState(false);

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

  const openDetail = useCallback((record: OfficeExpensePaymentOrder, mode: "view" | "edit") => {
    setDetailOrder(record);
    setDetailMode(mode);
    setDetailOpen(true);
    setDetailOpenKey((k: number) => k + 1);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailOrder(null);
  }, []);

  const handleCreate = useCallback(() => {
    navigate("create-office-po");
  }, [navigate]);

  const rawColumns = useOfficeExpenseColumns(openDetail);
  const columns = rawColumns.map((col) => ({ id: col.key, label: col.label, render: col.render }));

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-base font-semibold">Office Expense Payment Orders ({table.total})</h2>
        <div className="flex items-center gap-2">
          <SearchField name="office-expense-search" value={search} onChange={setSearch}>
            <Label className="sr-only">Search orders</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input className="w-65" placeholder="Search orders..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          {canCreate && (
            <Button variant="primary" onPress={handleCreate}>
              <Plus className="h-4 w-4" />
              Create
            </Button>
          )}
        </div>
      </div>

      {table.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Office Expense Payment Orders table" className="min-w-full">
              <Table.Header columns={columns}>
                {(col) => <Table.Column>{col.label}</Table.Column>}
              </Table.Header>
              <Table.Body items={table.items}>
                {(record) => (
                  <Table.Row id={record.id}>
                    <Table.Collection items={columns}>
                      {(col) => <Table.Cell>{col.render(record)}</Table.Cell>}
                    </Table.Collection>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
          {!table.isLoading && table.total > table.pageSize && (
            <Table.Footer>
              <div className="flex justify-end pt-4">
                <PageControls
                  totalPages={Math.ceil(table.total / table.pageSize)}
                  page={table.page}
                  onPageChange={table.setPage}
                />
              </div>
            </Table.Footer>
          )}
        </Table>
      )}

      <OfficeExpensePaymentOrderDetailModal
        key={detailOpenKey}
        order={detailOrder}
        open={detailOpen}
        mode={detailMode}
        onClose={closeDetail}
        onSuccess={() => {
          void table.refetch();
        }}
      />
    </>
  );
}
