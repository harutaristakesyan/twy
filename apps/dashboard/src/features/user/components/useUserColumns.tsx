import { Chip } from "@heroui/react";
import { ActionsMenu } from "@/components/ActionsMenu";
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
  const renderCell = (record: User, colId: string) => {
    const isCurrentUser = currentUserEmail === record.email;
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
          <ActionsMenu
            actions={[
              { type: "edit", disabled: isCurrentUser, onAction: () => onEdit(record) },
              {
                type: "delete",
                disabled: isCurrentUser || isDeleting,
                onAction: () => onDelete(record.id),
              },
            ]}
          />
        );
      default:
        return null;
    }
  };

  return { columns: USER_COLUMNS, renderCell };
}
