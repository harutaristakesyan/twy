import { Chip } from "@heroui/react";
import { ActionsMenu } from "@/components/ActionsMenu";
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
  const renderCell = (load: Load, colId: string) => {
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
          <ActionsMenu
            actions={[
              {
                header: "Actions",
                items: [
                  { type: "edit", hidden: !canEdit, onAction: () => onEdit(load) },
                  { type: "status", hidden: !canTransition, onAction: () => onStatusUpdate(load) },
                ],
              },
              {
                header: "Danger zone",
                items: [
                  {
                    type: "delete",
                    hidden: !canDelete,
                    disabled: isDeleting,
                    onAction: () => onDelete(load.id),
                  },
                ],
              },
            ]}
          />
        );
      }
      default:
        return null;
    }
  };

  return { columns: LOAD_COLUMNS, renderCell };
}
