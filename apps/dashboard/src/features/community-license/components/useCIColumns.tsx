import { Chip } from "@heroui/react";
import { ActionsMenu } from "@/components/ActionsMenu";
import type { CommunityLicense } from "../types/communityLicense";

export type CIColumnDef = {
  id: string;
  label: string;
  isRowHeader?: boolean;
};

export const CI_COLUMNS: CIColumnDef[] = [
  { id: "ciNumber", label: "CI Number", isRowHeader: true },
  { id: "validFrom", label: "Valid From" },
  { id: "validTo", label: "Valid To" },
  { id: "createdAt", label: "Created" },
  { id: "actions", label: "Actions" },
];

type UseCIColumnsParams = {
  canEdit: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  onEdit: (ci: CommunityLicense) => void;
  onDelete: (id: string) => void;
};

export function useCIColumns({
  canEdit,
  canDelete,
  isDeleting,
  onEdit,
  onDelete,
}: UseCIColumnsParams) {
  const renderCell = (record: CommunityLicense, colId: string) => {
    switch (colId) {
      case "ciNumber":
        return <span className="font-medium">{record.ciNumber}</span>;
      case "validFrom":
        return record.validFrom ?? "—";
      case "validTo":
        return record.validTo ? (
          record.validTo
        ) : (
          <Chip color="accent" size="sm" variant="soft">
            Open-ended
          </Chip>
        );
      case "createdAt":
        return new Date(record.createdAt).toLocaleDateString();
      case "actions":
        return (
          <ActionsMenu
            actions={[
              { type: "edit", hidden: !canEdit, onAction: () => onEdit(record) },
              {
                type: "delete",
                hidden: !canDelete,
                disabled: isDeleting,
                onAction: () => onDelete(record.id),
              },
            ]}
          />
        );
      default:
        return null;
    }
  };

  return { columns: CI_COLUMNS, renderCell };
}
