import { Pencil, TrashBin } from "@gravity-ui/icons";
import { Button, Chip } from "@heroui/react";
import { useCallback } from "react";
import type { Carrier } from "../types/carrier";
import { CarrierStatus } from "../types/carrier";
import { deriveInsuranceStatus } from "../utils/insuranceStatus";

export type CarrierColumnDef = {
  id: string;
  label: string;
  isRowHeader?: boolean;
};

export const CARRIER_COLUMNS: CarrierColumnDef[] = [
  { id: "carrierName", label: "Carrier Name", isRowHeader: true },
  { id: "mcDotNumber", label: "MC / DOT Number" },
  { id: "equipmentType", label: "Equipment Type" },
  { id: "insurance", label: "Insurance Status" },
  { id: "status", label: "Status" },
  { id: "contact", label: "Contact Info" },
  { id: "createdAt", label: "Created" },
  { id: "actions", label: "Actions" },
];

const statusColor: Record<CarrierStatus, "success" | "danger"> = {
  [CarrierStatus.APPROVED]: "success",
  [CarrierStatus.DENIED]: "danger",
};

const insuranceColor: Record<string, "success" | "danger" | "warning"> = {
  Valid: "success",
  Expired: "danger",
  Pending: "warning",
};

type UseCarrierColumnsParams = {
  canEdit: boolean;
  isDeleting: boolean;
  onEdit: (carrier: Carrier) => void;
  onDelete: (id: string) => void;
};

export function useCarrierColumns({
  canEdit,
  isDeleting,
  onEdit,
  onDelete,
}: UseCarrierColumnsParams) {
  const renderCell = useCallback(
    (carrier: Carrier, colId: string) => {
      switch (colId) {
        case "carrierName":
          return <span className="font-medium">{carrier.carrierName}</span>;
        case "mcDotNumber":
          return (
            <Chip size="sm" variant="soft">
              {carrier.mcDotNumber}
            </Chip>
          );
        case "equipmentType":
          return (
            carrier.equipmentType ?? <span className="text-xs text-default-400">Not specified</span>
          );
        case "insurance": {
          const { label } = deriveInsuranceStatus(carrier.insuranceExpiry);
          return (
            <Chip color={insuranceColor[label] ?? "default"} size="sm" variant="soft">
              {label}
            </Chip>
          );
        }
        case "status":
          return (
            <Chip color={statusColor[carrier.status] ?? "default"} size="sm" variant="soft">
              {carrier.status === CarrierStatus.APPROVED ? "Approved" : "Denied"}
            </Chip>
          );
        case "contact":
          return (
            <div className="flex flex-col gap-0.5 text-xs">
              {carrier.phone && <span>{carrier.phone}</span>}
              {carrier.email && <span className="text-default-500">{carrier.email}</span>}
              {!carrier.phone && !carrier.email && (
                <span className="text-default-400">No contact info</span>
              )}
            </div>
          );
        case "createdAt":
          return carrier.createdAt ? new Date(carrier.createdAt).toLocaleDateString() : "N/A";
        case "actions":
          if (!canEdit) return null;
          return (
            <div className="flex items-center gap-1">
              <Button
                isIconOnly
                size="sm"
                variant="tertiary"
                aria-label="Edit carrier"
                onPress={() => onEdit(carrier)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="danger-soft"
                aria-label="Delete carrier"
                isDisabled={isDeleting}
                onPress={() => onDelete(carrier.id)}
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

  return { columns: CARRIER_COLUMNS, renderCell };
}
