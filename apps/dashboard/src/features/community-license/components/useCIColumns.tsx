import { Pencil, TrashBin } from "@gravity-ui/icons";
import { Button, Chip } from "@heroui/react";
import { useCallback } from "react";
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
  isDeleting: boolean;
  onEdit: (ci: CommunityLicense) => void;
  onDelete: (id: string) => void;
};

export function useCIColumns({ canEdit, isDeleting, onEdit, onDelete }: UseCIColumnsParams) {
  const renderCell = useCallback(
    (record: CommunityLicense, colId: string) => {
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
          if (!canEdit) return null;
          return (
            <div className="flex items-center gap-1">
              <Button
                isIconOnly
                size="sm"
                variant="tertiary"
                aria-label="Edit community license"
                onPress={() => onEdit(record)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="danger-soft"
                aria-label="Delete community license"
                isDisabled={isDeleting}
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
    [canEdit, isDeleting, onEdit, onDelete],
  );

  return { columns: CI_COLUMNS, renderCell };
}
