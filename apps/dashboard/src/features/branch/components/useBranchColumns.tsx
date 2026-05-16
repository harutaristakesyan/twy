import { House } from "@gravity-ui/icons";
import { Chip } from "@heroui/react";
import { ActionsMenu } from "@/components/ActionsMenu";
import { UserAvatar } from "@/components/UserAvatar";
import type { Branch } from "../types/branch";

export type BranchColumnDef = {
  id: string;
  label: string;
  isRowHeader?: boolean;
};

export const BRANCH_COLUMNS: BranchColumnDef[] = [
  { id: "name", label: "Branch Name", isRowHeader: true },
  { id: "owner", label: "Owner" },
  { id: "contact", label: "Contact" },
  { id: "ci", label: "Community License" },
  { id: "createdAt", label: "Created Date" },
  { id: "actions", label: "Actions" },
];

type UseBranchColumnsParams = {
  canEdit: boolean;
  isDeleting: boolean;
  onEdit: (branch: Branch) => void;
  onDelete: (id: string) => void;
};

export function useBranchColumns({
  canEdit,
  isDeleting,
  onEdit,
  onDelete,
}: UseBranchColumnsParams) {
  const renderCell = (record: Branch, colId: string) => {
    switch (colId) {
      case "name":
        return (
          <div className="flex items-center gap-2">
            <House className="h-4 w-4 text-default-500" />
            <span className="font-medium">{record.name}</span>
          </div>
        );
      case "owner":
        return record.owner ? (
          <div className="flex items-center gap-3">
            <UserAvatar
              fullName={`${record.owner.firstName} ${record.owner.lastName}`.trim()}
              showName={false}
              size="sm"
            />
            <div className="flex flex-col">
              <span className="font-medium">
                {record.owner.firstName} {record.owner.lastName}
              </span>
              <span className="text-xs text-default-500">{record.owner.email}</span>
            </div>
          </div>
        ) : (
          <Chip size="sm" variant="soft">
            No owner
          </Chip>
        );
      case "contact":
        return record.contact ? (
          <span className="block max-w-[200px] truncate text-sm" title={record.contact}>
            {record.contact}
          </span>
        ) : (
          <Chip size="sm" variant="soft">
            No contact
          </Chip>
        );
      case "ci":
        return record.ci ? (
          <Chip color="accent" size="sm" variant="soft">
            {record.ci.ciNumber}
          </Chip>
        ) : (
          <span className="text-default-400">—</span>
        );
      case "createdAt":
        return record.createdAt ? new Date(record.createdAt).toLocaleDateString() : "N/A";
      case "actions":
        return canEdit ? (
          <ActionsMenu
            actions={[
              { type: "edit", onAction: () => onEdit(record) },
              { type: "delete", disabled: isDeleting, onAction: () => onDelete(record.id) },
            ]}
          />
        ) : null;
      default:
        return null;
    }
  };

  return { columns: BRANCH_COLUMNS, renderCell };
}
