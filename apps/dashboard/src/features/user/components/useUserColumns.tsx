import { Pencil, TrashBin } from "@gravity-ui/icons";
import { Button, Chip } from "@heroui/react";
import { useCallback } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import type { User } from "../types/user";

export type UserColumnDef = {
  id: string;
  label: string;
  isRowHeader?: boolean;
};

export const USER_COLUMNS: UserColumnDef[] = [
  { id: "name", label: "Name", isRowHeader: true },
  { id: "team", label: "Team" },
  { id: "branch", label: "Branch" },
  { id: "status", label: "Status" },
  { id: "registered", label: "Registered" },
  { id: "actions", label: "Actions" },
];

type UseUserColumnsParams = {
  currentUserEmail?: string;
  canEdit: boolean;
  isDeleting: boolean;
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
};

export function useUserColumns({
  currentUserEmail,
  canEdit,
  isDeleting,
  onEdit,
  onDelete,
}: UseUserColumnsParams) {
  const renderCell = useCallback(
    (record: User, colId: string) => {
      const isCurrentUser = currentUserEmail === record.email;
      const selfTooltip = "You cannot edit or delete your own account";
      const fullName = `${record.firstName ?? ""} ${record.lastName ?? ""}`.trim();

      switch (colId) {
        case "name":
          return (
            <div className="flex items-center gap-3">
              <UserAvatar fullName={fullName} showName={false} size="sm" />
              <div className="flex flex-col">
                <span className="font-medium">{fullName}</span>
                <span className="text-xs text-default-500">{record.email}</span>
              </div>
            </div>
          );
        case "team":
          return record.teamName ? (
            <Chip color="accent" size="sm" variant="soft">
              {record.teamName}
            </Chip>
          ) : (
            <Chip size="sm" variant="soft">
              Unassigned
            </Chip>
          );
        case "branch":
          return record.branch?.name ?? record.branchName ?? "N/A";
        case "status":
          return (
            <Chip color={record.isActive ? "success" : "danger"} size="sm" variant="soft">
              {record.isActive ? "Active" : "Inactive"}
            </Chip>
          );
        case "registered": {
          const date = record.createdAt ?? record.registeredDate;
          return date ? new Date(date).toLocaleDateString() : "N/A";
        }
        case "actions":
          if (!canEdit) return null;
          return (
            <div className="flex items-center gap-1">
              <Button
                isIconOnly
                size="sm"
                variant="tertiary"
                aria-label={isCurrentUser ? selfTooltip : "Edit user"}
                isDisabled={isCurrentUser}
                onPress={() => onEdit(record)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="danger-soft"
                aria-label={isCurrentUser ? selfTooltip : "Delete user"}
                isDisabled={isCurrentUser || isDeleting}
                onPress={() => onDelete(record.id)}
              >
                <TrashBin className="h-4 w-4" />
              </Button>
            </div>
          );
        default:
          return null;
      }
    },
    [currentUserEmail, canEdit, isDeleting, onEdit, onDelete],
  );

  return { columns: USER_COLUMNS, renderCell };
}
