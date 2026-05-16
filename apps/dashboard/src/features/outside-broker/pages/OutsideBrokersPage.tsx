import { Plus } from "@gravity-ui/icons";
import { Button, Label, SearchField, toast } from "@heroui/react";
import type React from "react";
import { useCallback, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useServerTable } from "@/hooks/useServerTable";
import { useApiMutation } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteOutsideBroker, getOutsideBrokers } from "../api/brokerApi";
import OutsideBrokersManagementTable from "../components/OutsideBrokersManagementTable";
import { useOutsideBrokerColumns } from "../components/useOutsideBrokerColumns";
import type { OutsideBroker } from "../types/broker";

const OutsideBrokersPage: React.FC = () => {
  const navigate = useNavigate();
  const { permissions } = useCurrentUser();
  const canCreate = Boolean(permissions.brokers?.add);
  const canEdit = Boolean(permissions.brokers?.edit);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const table = useServerTable<OutsideBroker>({
    queryKey: ["outside-brokers", debouncedSearch],
    fetcher: async ({ page, pageSize }) => {
      const result = await getOutsideBrokers({
        page: page - 1,
        limit: pageSize,
        query: debouncedSearch || undefined,
      });
      return { items: result.brokers, total: result.total };
    },
    initialPageSize: 10,
  });

  const deleteMutation = useApiMutation((id: string) => deleteOutsideBroker(id), {
    onSuccess: () => {
      toast.success("Outside broker deleted successfully");
      void table.refetch();
    },
    onError: (err: unknown) => toast.danger(getErrorMessage(err)),
  });

  const handleCreate = useCallback(() => navigate("create"), [navigate]);
  const handleEdit = useCallback(
    (broker: OutsideBroker) => navigate(`${broker.id}/edit`),
    [navigate],
  );

  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const handleDelete = useCallback(
    (id: string) =>
      confirm({
        title: "Delete this broker?",
        description: "This action cannot be undone.",
        confirmLabel: "Delete",
        status: "danger",
        onConfirm: () => deleteMutation.mutate(id),
      }),
    [confirm, deleteMutation],
  );

  const { columns, renderCell } = useOutsideBrokerColumns({
    canEdit,
    isDeleting: deleteMutation.isPending,
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Outside Brokers ({table.total})</h2>
        <div className="flex items-center gap-2">
          <SearchField name="brokers-search" value={search} onChange={setSearch}>
            <Label className="sr-only">Search brokers</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input className="w-65" placeholder="Search brokers..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          {canCreate && (
            <Button variant="primary" onPress={handleCreate}>
              <Plus className="h-4 w-4" />
              Add Broker
            </Button>
          )}
        </div>
      </div>

      <OutsideBrokersManagementTable
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

export default OutsideBrokersPage;
