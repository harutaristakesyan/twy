import { Plus } from "@gravity-ui/icons";
import { Button, Label, SearchField, Spinner, Table, toast } from "@heroui/react";
import type React from "react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import PageControls from "@/components/PageControls";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useServerTable } from "@/hooks/useServerTable";
import { useApiMutation } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteCarrier, getCarriers } from "../api/carrierApi";
import type { Carrier, CarrierKind } from "../types/carrier";
import { useCarrierColumns } from "./useCarrierColumns";

interface CarrierTableProps {
  kind: CarrierKind;
}

const CarrierTable: React.FC<CarrierTableProps> = ({ kind }) => {
  const navigate = useNavigate();
  const { permissions } = useCurrentUser();
  const addResource = kind === "twy" ? "carriers_twy" : "carriers_outside";
  const editResource = kind === "twy" ? "carriers_twy" : "carriers_outside";
  const canCreate = Boolean(permissions[addResource]?.add);
  const canEdit = Boolean(permissions[editResource]?.edit);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const table = useServerTable<Carrier>({
    queryKey: ["carriers", kind, debouncedSearch],
    fetcher: async ({ page, pageSize }) => {
      const result = await getCarriers({
        kind,
        page: page - 1,
        limit: pageSize,
        query: debouncedSearch || undefined,
      });
      return { items: result.carriers, total: result.total };
    },
    initialPageSize: 10,
  });

  const deleteMutation = useApiMutation((id: string) => deleteCarrier(id), {
    onSuccess: () => {
      toast.success("Carrier deleted successfully");
      void table.refetch();
    },
    onError: (err: unknown) => toast.danger(getErrorMessage(err)),
  });

  const handleCreate = useCallback(() => navigate("create"), [navigate]);
  const handleEdit = useCallback((carrier: Carrier) => navigate(`${carrier.id}/edit`), [navigate]);

  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const handleDelete = useCallback(
    (id: string) =>
      confirm({
        title: "Delete this carrier?",
        description: "This action cannot be undone.",
        confirmLabel: "Delete",
        status: "danger",
        onConfirm: () => deleteMutation.mutate(id),
      }),
    [confirm, deleteMutation],
  );

  const { columns, renderCell } = useCarrierColumns({
    canEdit,
    isDeleting: deleteMutation.isPending,
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  const title = kind === "twy" ? "Twy Carriers" : "Outside Carriers";

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">
          {title} ({table.total})
        </h2>
        <div className="flex items-center gap-2">
          <SearchField name="carriers-search" value={search} onChange={setSearch}>
            <Label className="sr-only">Search carriers</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input className="w-65" placeholder="Search carriers..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          {canCreate && (
            <Button variant="primary" onPress={handleCreate}>
              <Plus className="h-4 w-4" />
              Add Carrier
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
            <Table.Content aria-label={title} className="min-w-full">
              <Table.Header columns={columns}>
                {(col) => <Table.Column isRowHeader={col.isRowHeader}>{col.label}</Table.Column>}
              </Table.Header>
              <Table.Body items={table.items}>
                {(carrier) => (
                  <Table.Row id={carrier.id}>
                    <Table.Collection items={columns}>
                      {(col) => <Table.Cell>{renderCell(carrier, col.id)}</Table.Cell>}
                    </Table.Collection>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
          {table.total > table.pageSize && (
            <Table.Footer>
              <div className="flex justify-end pt-3">
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

      {confirmDialog}
    </div>
  );
};

export default CarrierTable;
