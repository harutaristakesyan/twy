import { Plus } from "@gravity-ui/icons";
import { Button, Label, SearchField, Spinner, Table } from "@heroui/react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageControls from "@/components/PageControls";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePermission } from "@/hooks/usePermission";
import { useServerTable } from "@/hooks/useServerTable";
import { paymentOrderApi } from "../api/paymentOrderApi";
import { usePaymentOrderModal } from "../hooks/usePaymentOrderModal";
import type { PaymentOrder } from "../types/paymentOrder";
import UpdatePaymentStatusModal from "./UpdatePaymentStatusModal";
import { useLoadPaymentOrderColumns } from "./useLoadPaymentOrderColumns";

export default function LoadPaymentOrdersTab() {
  const navigate = useNavigate();
  const canCreate = usePermission("load_payment_order", "add");
  const { selectedOrder, open, mode, openModal, closeModal } = usePaymentOrderModal();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const table = useServerTable<PaymentOrder>({
    queryKey: ["payment-orders", debouncedSearch],
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

  const rawColumns = useLoadPaymentOrderColumns(openModal);
  const columns = rawColumns.map((col) => ({ id: col.key, label: col.label, render: col.render }));

  const handleCreate = useCallback(() => {
    navigate("create-load-po");
  }, [navigate]);

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-base font-semibold">Load Payment Orders ({table.total})</h2>
        <div className="flex items-center gap-2">
          <SearchField name="load-po-search" value={search} onChange={setSearch}>
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
            <Table.Content aria-label="Load Payment Orders table" className="min-w-full">
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

      <UpdatePaymentStatusModal
        paymentOrder={selectedOrder}
        open={open}
        mode={mode}
        onClose={closeModal}
        onSuccess={() => {
          void table.refetch();
        }}
      />
    </>
  );
}
