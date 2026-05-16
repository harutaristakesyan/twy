import { Plus } from "@gravity-ui/icons";
import { Button, toast } from "@heroui/react";
import type React from "react";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable } from "@/components/DataTable";
import { Search } from "@/components/Search";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useServerTable } from "@/hooks/useServerTable";
import { useApiMutation } from "@/libs/query";
import { deleteUser, getUsers } from "../api/userApi";
import { useUserColumns } from "../components/useUserColumns";
import type { User as UserType } from "../types/user";

type SortField = "firstName" | "lastName" | "email" | "isActive" | "createdAt" | "branch";

const UsersPage: React.FC = () => {
  const { user: currentUser, permissions } = useCurrentUser();
  const canAdd = permissions.users.add;
  const canEdit = permissions.users.edit;
  const canDelete = permissions.users.delete;
  const navigate = useNavigate();

  const [query, setQuery] = useState("");

  const { items, total, page, pageSize, isLoading, setPage, refetch } = useServerTable<UserType>({
    queryKey: ["users", query],
    fetcher: async ({ page: p, pageSize: ps, sort }) => {
      const result = await getUsers({
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
      return { items: result.users, total: result.total };
    },
    initialPageSize: 10,
  });

  const deleteMutation = useApiMutation(deleteUser, {
    onSuccess: () => {
      toast.success("User deleted successfully");
      refetch();
    },
  });

  const handleCreate = () => navigate("create");
  const handleEdit = (user: UserType) => navigate(`${user.id}/edit`);

  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const handleDelete = (id: string) => {
    confirm({
      title: "Delete this user?",
      description: "This action cannot be undone.",
      confirmLabel: "Delete",
      status: "danger",
      onConfirm: () => deleteMutation.mutate(id),
    });
  };

  const { columns, renderCell } = useUserColumns({
    currentUserEmail: currentUser?.email,
    canEdit,
    canDelete,
    isDeleting: deleteMutation.isPending,
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Users ({total})</h2>
        <div className="flex items-center gap-2">
          <Search
            name="users-search"
            query={query}
            onQueryChange={setQuery}
            placeholder="Search users..."
          />
          {canAdd && (
            <Button variant="primary" onPress={handleCreate}>
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          )}
        </div>
      </div>

      <DataTable
        ariaLabel="Users"
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

export default UsersPage;
