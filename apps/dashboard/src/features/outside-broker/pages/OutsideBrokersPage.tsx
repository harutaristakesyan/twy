import { Plus } from "@gravity-ui/icons";
import { Button, toast } from "@heroui/react";
import type React from "react";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable } from "@/components/DataTable";
import { Search } from "@/components/Search";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useServerTable } from "@/hooks/useServerTable";
import { useApiMutation } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteOutsideBroker, getOutsideBrokers } from "../api/brokerApi";
import { useOutsideBrokerColumns } from "../components/useOutsideBrokerColumns";
import type { OutsideBroker } from "../types/broker";

const OutsideBrokersPage: React.FC = () => {
  const navigate = useNavigate();
  const { permissions } = useCurrentUser();
  const canCreate = Boolean(permissions.brokers?.add);
  const canEdit = Boolean(permissions.brokers?.edit);
  const canDelete = Boolean(permissions.brokers?.delete);

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

  const handleCreate = () => navigate("create");
  const handleEdit = (broker: OutsideBroker) => navigate(`${broker.id}/edit`);

  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const handleDelete = (id: string) =>
    confirm({
      title: "Delete this broker?",
      description: "This action cannot be undone.",
      confirmLabel: "Delete",
      status: "danger",
      onConfirm: () => deleteMutation.mutate(id),
    });

  const { columns, renderCell } = useOutsideBrokerColumns({
    canEdit,
    canDelete,
    isDeleting: deleteMutation.isPending,
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Outside Brokers ({table.total})</h2>
        <div className="flex items-center gap-2">
          <Search query={search} onQueryChange={setSearch} placeholder="Search brokers..." />
          {canCreate && (
            <Button variant="primary" onPress={handleCreate}>
              <Plus className="h-4 w-4" />
              Add Broker
            </Button>
          )}
        </div>
      </div>

      <DataTable
        ariaLabel="Outside brokers"
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
