import { Plus } from "@gravity-ui/icons";
import { Button, toast } from "@heroui/react";
import type React from "react";
import { useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useServerTable } from "@/hooks/useServerTable";
import { useApiMutation } from "@/libs/query";
import { deleteCommunityLicense, getCommunityLicenses } from "../api/ciApi";
import CIManagementTable from "../components/CIManagementTable";
import { useCIColumns } from "../components/useCIColumns";
import type { CommunityLicense } from "../types/communityLicense";

type SortField = "ciNumber" | "validFrom" | "createdAt";

const CIManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { permissions } = useCurrentUser();
  const canAdd = permissions.settings.add;
  const canEdit = permissions.settings.edit;

  const { items, total, page, pageSize, isLoading, setPage, refetch } =
    useServerTable<CommunityLicense>({
      queryKey: ["community-licenses"],
      fetcher: async ({ page: p, pageSize: ps, sort }) => {
        const result = await getCommunityLicenses({
          page: p - 1,
          limit: ps,
          sortField: sort?.column as SortField | undefined,
          sortOrder:
            sort?.direction === "ascending"
              ? "ascend"
              : sort?.direction === "descending"
                ? "descend"
                : undefined,
        });
        return { items: result.communityLicenses, total: result.total };
      },
      initialPageSize: 10,
    });

  const deleteMutation = useApiMutation(deleteCommunityLicense, {
    onSuccess: () => {
      toast.success("Community license deleted successfully");
      refetch();
    },
  });

  const handleCreate = useCallback(() => navigate("create"), [navigate]);
  const handleEdit = useCallback((ci: CommunityLicense) => navigate(`${ci.id}/edit`), [navigate]);

  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const handleDelete = useCallback(
    (id: string) => {
      confirm({
        title: "Delete this community license?",
        description: "This action cannot be undone. Branches using this CI must be updated first.",
        confirmLabel: "Delete",
        status: "danger",
        onConfirm: () => deleteMutation.mutate(id),
      });
    },
    [confirm, deleteMutation],
  );

  const { columns, renderCell } = useCIColumns({
    canEdit,
    isDeleting: deleteMutation.isPending,
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Community Licenses ({total})</h2>
        {canAdd && (
          <Button variant="primary" onPress={handleCreate}>
            <Plus className="h-4 w-4" />
            Add Community License
          </Button>
        )}
      </div>

      <CIManagementTable
        items={items}
        columns={columns}
        renderCell={renderCell}
        total={total}
        page={page}
        pageSize={pageSize}
        isLoading={isLoading}
        onPageChange={setPage}
      />
      <Outlet />
      {confirmDialog}
    </div>
  );
};

export default CIManagementPage;
