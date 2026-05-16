import { Chip } from "@heroui/react";
import { ActionsMenu } from "@/components/ActionsMenu";
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
  const renderCell = (carrier: Carrier, colId: string) => {
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
        return canEdit ? (
          <ActionsMenu
            actions={[
              { type: "edit", onAction: () => onEdit(carrier) },
              { type: "delete", disabled: isDeleting, onAction: () => onDelete(carrier.id) },
            ]}
          />
        ) : null;
      default:
        return null;
    }
  };

  return { columns: CARRIER_COLUMNS, renderCell };
}
