import { Chip } from "@heroui/react";
import { ActionsMenu } from "@/components/ActionsMenu";
import type { CarrierRequest } from "../types/carrierRequest";

export type CarrierRequestColumnDef = {
  id: string;
  label: string;
  isRowHeader?: boolean;
};

export const CARRIER_REQUEST_COLUMNS: CarrierRequestColumnDef[] = [
  { id: "carrierName", label: "Carrier Name", isRowHeader: true },
  { id: "mcDotNumber", label: "MC / DOT" },
  { id: "kind", label: "Kind" },
  { id: "status", label: "Status" },
  { id: "submittedBy", label: "Submitted By" },
  { id: "createdAt", label: "Submitted" },
  { id: "actions", label: "Actions" },
];

const statusColor: Record<string, "success" | "warning" | "danger"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

type CarrierRequestColumnsParams = {
  canView: boolean;
  onView: (request: CarrierRequest) => void;
};

export function getCarrierRequestColumns({ canView, onView }: CarrierRequestColumnsParams) {
  const renderCell = (req: CarrierRequest, colId: string) => {
    switch (colId) {
      case "carrierName":
        return <span className="font-medium">{req.carrierName}</span>;
      case "mcDotNumber":
        return (
          <Chip size="sm" variant="soft">
            {req.mcDotNumber}
          </Chip>
        );
      case "kind":
        return <span className="text-xs capitalize">{req.kind}</span>;
      case "status":
        return (
          <Chip color={statusColor[req.status] ?? "default"} size="sm" variant="soft">
            {req.status}
          </Chip>
        );
      case "submittedBy":
        return <span className="text-sm">{req.submittedByName ?? "—"}</span>;
      case "createdAt":
        return new Date(req.createdAt).toLocaleDateString();
      case "actions":
        return (
          <ActionsMenu
            actions={[{ type: "view", hidden: !canView, onAction: () => onView(req) }]}
          />
        );
      default:
        return null;
    }
  };

  return { columns: CARRIER_REQUEST_COLUMNS, renderCell };
}
