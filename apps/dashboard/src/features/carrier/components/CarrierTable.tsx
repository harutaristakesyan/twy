import { Plus } from "@gravity-ui/icons";
import { Button, toast } from "@heroui/react";
import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable } from "@/components/DataTable";
import { Search } from "@/components/Search";
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

  const handleCreate = () => navigate("create");
  const handleEdit = (carrier: Carrier) => navigate(`${carrier.id}/edit`);

  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const handleDelete = (id: string) =>
    confirm({
      title: "Delete this carrier?",
      description: "This action cannot be undone.",
      confirmLabel: "Delete",
      status: "danger",
      onConfirm: () => deleteMutation.mutate(id),
    });

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
          <Search query={search} onQueryChange={setSearch} placeholder="Search carriers..." />
          {canCreate && (
            <Button variant="primary" onPress={handleCreate}>
              <Plus className="h-4 w-4" />
              Add Carrier
            </Button>
          )}
        </div>
      </div>

      <DataTable
        ariaLabel={title}
        items={table.items}
        columns={columns}
        renderCell={renderCell}
        total={table.total}
        page={table.page}
        pageSize={table.pageSize}
        isLoading={table.isLoading}
        onPageChange={table.setPage}
      />

      {confirmDialog}
    </div>
  );
};

export default CarrierTable;
