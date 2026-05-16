import { Button, Chip } from "@heroui/react";
import { useCallback } from "react";
import type { BrokerRequest } from "../types/brokerRequest";

export type BrokerRequestColumnDef = {
  id: string;
  label: string;
  isRowHeader?: boolean;
};

export const BROKER_REQUEST_COLUMNS: BrokerRequestColumnDef[] = [
  { id: "brokerName", label: "Broker Name", isRowHeader: true },
  { id: "mcNumber", label: "MC Number" },
  { id: "status", label: "Status" },
  { id: "submittedBy", label: "Submitted By" },
  { id: "creditLimit", label: "Credit Limit" },
  { id: "createdAt", label: "Submitted" },
  { id: "actions", label: "Actions" },
];

const statusColor: Record<string, "success" | "warning" | "danger"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

type UseBrokerRequestColumnsParams = {
  onView: (request: BrokerRequest) => void;
};

export function useBrokerRequestColumns({ onView }: UseBrokerRequestColumnsParams) {
  const renderCell = useCallback(
    (req: BrokerRequest, colId: string) => {
      switch (colId) {
        case "brokerName":
          return <span className="font-medium">{req.brokerName}</span>;
        case "mcNumber":
          return (
            <Chip size="sm" variant="soft">
              {req.mcNumber}
            </Chip>
          );
        case "status":
          return (
            <Chip color={statusColor[req.status] ?? "default"} size="sm" variant="soft">
              {req.status}
            </Chip>
          );
        case "submittedBy":
          return req.submittedByName ?? "—";
        case "creditLimit":
          return req.creditLimitUnlimited
            ? "Unlimited"
            : req.creditLimit != null
              ? `€${req.creditLimit.toFixed(2)}`
              : "—";
        case "createdAt":
          return new Date(req.createdAt).toLocaleDateString();
        case "actions":
          return (
            <Button size="sm" variant="tertiary" onPress={() => onView(req)}>
              View
            </Button>
          );
        default:
          return null;
      }
    },
    [onView],
  );

  return { columns: BROKER_REQUEST_COLUMNS, renderCell };
}
