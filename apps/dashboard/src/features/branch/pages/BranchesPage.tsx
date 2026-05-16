import { Plus } from "@gravity-ui/icons";
import { Button, Label, SearchField, toast } from "@heroui/react";
import type React from "react";
import { useCallback, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useServerTable } from "@/hooks/useServerTable";
import { useApiMutation } from "@/libs/query";
import { deleteBranch, getBranches } from "../api/branchApi";
import BranchManagementTable from "../components/BranchManagementTable";
import { useBranchColumns } from "../components/useBranchColumns";
import type { Branch } from "../types/branch";

type SortField = "name" | "createdAt" | "contact";

const BranchesPage: React.FC = () => {
  const { permissions } = useCurrentUser();
  const canAdd = permissions.branches.add;
  const canEdit = permissions.branches.edit;
  const navigate = useNavigate();

  const [query, setQuery] = useState("");

  const { items, total, page, pageSize, isLoading, setPage, refetch } = useServerTable<Branch>({
    queryKey: ["branches", query],
    fetcher: async ({ page: p, pageSize: ps, sort }) => {
      const result = await getBranches({
        page: p - 1,
        limit: ps,
        sortField: sort?.column as SortField | undefined,
        sortOrder:
          sort?.direction === "ascending"
            ? "ascend"
            : sort?.direction === "descending"
              ? "descend"
              : undefined,
        query: query || undefined,
      });
      return { items: result.branches, total: result.total };
    },
    initialPageSize: 10,
  });

  const deleteMutation = useApiMutation(deleteBranch, {
    onSuccess: () => {
      toast.success("Branch deleted successfully");
      refetch();
    },
  });

  const handleCreate = useCallback(() => navigate("create"), [navigate]);
  const handleEdit = useCallback((branch: Branch) => navigate(`${branch.id}/edit`), [navigate]);

  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const handleDelete = useCallback(
    (id: string) => {
      confirm({
        title: "Delete this branch?",
        description: "This action cannot be undone. All associated data may be affected.",
        confirmLabel: "Delete",
        status: "danger",
        onConfirm: () => deleteMutation.mutate(id),
      });
    },
    [confirm, deleteMutation],
  );

  const { columns, renderCell } = useBranchColumns({
    canEdit,
    isDeleting: deleteMutation.isPending,
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Branches ({total})</h2>
        <div className="flex items-center gap-2">
          <SearchField name="branches-search" value={query} onChange={setQuery}>
            <Label className="sr-only">Search branches</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input className="w-65" placeholder="Search branches..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          {canAdd && (
            <Button variant="primary" onPress={handleCreate}>
              <Plus className="h-4 w-4" />
              Add Branch
            </Button>
          )}
        </div>
      </div>

      <BranchManagementTable
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

export default BranchesPage;
