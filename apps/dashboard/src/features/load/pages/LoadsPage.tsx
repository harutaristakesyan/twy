import { Plus } from "@gravity-ui/icons";
import { Button, Label, SearchField, toast } from "@heroui/react";
import type React from "react";
import { useCallback, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { loadApi } from "@/features/load/api/loadApi";
import LoadManagementTable from "@/features/load/components/LoadManagementTable";
import { useLoadColumns } from "@/features/load/components/useLoadColumns";
import type { Load } from "@/features/load/types/load";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useServerTable } from "@/hooks/useServerTable";
import { useApiMutation } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";

const LoadsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, permissions } = useCurrentUser();
  const isBranchAssigned = user?.branch?.id !== undefined && user?.branch?.id !== null;
  const canAdd = Boolean(permissions.loads?.add);
  const canEdit = Boolean(permissions.loads?.edit);
  const canDelete = Boolean(permissions.loads?.delete);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const table = useServerTable<Load>({
    queryKey: ["loads", debouncedSearch],
    fetcher: async ({ page, pageSize }) => {
      const result = await loadApi.getAll({
        page: page - 1,
        limit: pageSize,
        query: debouncedSearch || undefined,
      });
      return { items: result.loads, total: result.total };
    },
    initialPageSize: 10,
  });

  const deleteMutation = useApiMutation((id: string) => loadApi.delete(id), {
    onSuccess: () => {
      toast.success("Load deleted successfully");
      void table.refetch();
    },
    onError: (err: unknown) => toast.danger(getErrorMessage(err)),
  });

  const handleEdit = useCallback((load: Load) => navigate(`${load.id}/edit`), [navigate]);
  const handleStatusUpdate = useCallback((load: Load) => navigate(`${load.id}/status`), [navigate]);

  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const handleDelete = useCallback(
    (id: string) =>
      confirm({
        title: "Delete this load?",
        description: "This action cannot be undone.",
        confirmLabel: "Delete",
        status: "danger",
        onConfirm: () => deleteMutation.mutate(id),
      }),
    [confirm, deleteMutation],
  );

  const { columns, renderCell } = useLoadColumns({
    canEdit,
    canDelete,
    isDeleting: deleteMutation.isPending,
    onEdit: handleEdit,
    onStatusUpdate: handleStatusUpdate,
    onDelete: handleDelete,
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Loads ({table.total})</h2>
        <div className="flex items-center gap-2">
          <SearchField name="loads-search" value={search} onChange={setSearch}>
            <Label className="sr-only">Search loads</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input className="w-65" placeholder="Search loads..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          {canAdd && (
            <span
              title={
                !isBranchAssigned
                  ? "You must be assigned to a branch before creating a load"
                  : undefined
              }
            >
              <Button
                variant="primary"
                isDisabled={!isBranchAssigned}
                onPress={() => navigate("/loads/create")}
              >
                <Plus className="h-4 w-4" />
                Create New Load
              </Button>
            </span>
          )}
        </div>
      </div>

      <LoadManagementTable
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
      {confirmDialog}
    </div>
  );
};

export default LoadsPage;
