import { ArrowRotateRight, Pencil, TrashBin } from "@gravity-ui/icons";
import { Button, Chip } from "@heroui/react";
import { useCallback } from "react";
import type { Load } from "@/features/load/types/load";
import { getAllowedTransitions } from "@/features/load/utils/statusMachine";

export type LoadColumnDef = {
  id: string;
  label: string;
  isRowHeader?: boolean;
};

export const LOAD_COLUMNS: LoadColumnDef[] = [
  { id: "referenceNumber", label: "Reference #", isRowHeader: true },
  { id: "customer", label: "Customer" },
  { id: "carrier", label: "Carrier" },
  { id: "status", label: "Status" },
  { id: "branch", label: "Branch" },
  { id: "customerRate", label: "Customer Rate" },
  { id: "carrierRate", label: "Carrier Rate" },
  { id: "createdAt", label: "Created" },
  { id: "actions", label: "Actions" },
];

const statusColor: Record<string, "warning" | "success" | "accent" | "danger" | "default"> = {
  Pending: "warning",
  Approved: "success",
  Delivered: "accent",
  Declined: "danger",
  Hold: "warning",
};

type UseLoadColumnsParams = {
  canEdit: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  onEdit: (load: Load) => void;
  onStatusUpdate: (load: Load) => void;
  onDelete: (id: string) => void;
};

export function useLoadColumns({
  canEdit,
  canDelete,
  isDeleting,
  onEdit,
  onStatusUpdate,
  onDelete,
}: UseLoadColumnsParams) {
  const renderCell = useCallback(
    (load: Load, colId: string) => {
      switch (colId) {
        case "referenceNumber":
          return <span className="font-medium">{load.referenceNumber}</span>;
        case "customer":
          return load.customer;
        case "carrier":
          return load.carrier ?? "—";
        case "status":
          return (
            <Chip color={statusColor[load.status] ?? "default"} size="sm" variant="soft">
              {load.status}
            </Chip>
          );
        case "branch":
          return load.branchName;
        case "customerRate":
          return load.customerRate != null ? `€${load.customerRate.toFixed(2)}` : "—";
        case "carrierRate":
          return load.carrierRate != null ? `€${load.carrierRate.toFixed(2)}` : "—";
        case "createdAt":
          return new Date(load.createdAt).toLocaleDateString();
        case "actions": {
          const canTransition = getAllowedTransitions(load.status).length > 0;
          return (
            <div className="flex items-center gap-1">
              {canEdit && (
                <Button
                  isIconOnly
                  size="sm"
                  variant="tertiary"
                  aria-label="Edit load"
                  onPress={() => onEdit(load)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {canTransition && (
                <Button
                  isIconOnly
                  size="sm"
                  variant="tertiary"
                  aria-label="Update status"
                  onPress={() => onStatusUpdate(load)}
                >
                  <ArrowRotateRight className="h-4 w-4" />
                </Button>
              )}
              {canDelete && (
                <Button
                  isIconOnly
                  size="sm"
                  variant="danger-soft"
                  aria-label="Delete load"
                  isDisabled={isDeleting}
                  onPress={() => onDelete(load.id)}
                >
                  <TrashBin className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        }
        default:
          return null;
      }
    },
    [canEdit, canDelete, isDeleting, onEdit, onStatusUpdate, onDelete],
  );

  return { columns: LOAD_COLUMNS, renderCell };
}
