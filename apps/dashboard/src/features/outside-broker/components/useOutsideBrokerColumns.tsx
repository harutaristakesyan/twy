import { Pencil, TrashBin } from "@gravity-ui/icons";
import { Button, Chip } from "@heroui/react";
import { useCallback } from "react";
import type { OutsideBroker } from "../types/broker";
import { BrokerStatus } from "../types/broker";

export type OutsideBrokerColumnDef = {
  id: string;
  label: string;
  isRowHeader?: boolean;
};

export const OUTSIDE_BROKER_COLUMNS: OutsideBrokerColumnDef[] = [
  { id: "brokerName", label: "Broker Name", isRowHeader: true },
  { id: "mcNumber", label: "MC Number" },
  { id: "contactName", label: "Contact" },
  { id: "status", label: "Status" },
  { id: "creditLimit", label: "Credit Limit" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "actions", label: "Actions" },
];

const statusColor: Record<BrokerStatus, "success" | "warning" | "danger"> = {
  [BrokerStatus.APPROVED]: "success",
  [BrokerStatus.PENDING]: "warning",
  [BrokerStatus.DENIED]: "danger",
};

type UseOutsideBrokerColumnsParams = {
  canEdit: boolean;
  isDeleting: boolean;
  onEdit: (broker: OutsideBroker) => void;
  onDelete: (id: string) => void;
};

export function useOutsideBrokerColumns({
  canEdit,
  isDeleting,
  onEdit,
  onDelete,
}: UseOutsideBrokerColumnsParams) {
  const renderCell = useCallback(
    (broker: OutsideBroker, colId: string) => {
      switch (colId) {
        case "brokerName":
          return <span className="font-medium">{broker.brokerName}</span>;
        case "mcNumber":
          return (
            <Chip size="sm" variant="soft">
              {broker.mcNumber}
            </Chip>
          );
        case "contactName":
          return broker.contactName ?? "—";
        case "status":
          return (
            <Chip color={statusColor[broker.status] ?? "default"} size="sm" variant="soft">
              {broker.status}
            </Chip>
          );
        case "creditLimit":
          return broker.creditLimitUnlimited
            ? "Unlimited"
            : broker.creditLimit != null
              ? `€${broker.creditLimit.toFixed(2)}`
              : "—";
        case "email":
          return broker.email ?? "—";
        case "phone":
          return broker.phone ?? "—";
        case "actions":
          if (!canEdit) return null;
          return (
            <div className="flex items-center gap-1">
              <Button
                isIconOnly
                size="sm"
                variant="tertiary"
                aria-label="Edit broker"
                onPress={() => onEdit(broker)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="danger-soft"
                aria-label="Delete broker"
                isDisabled={isDeleting}
                onPress={() => onDelete(broker.id)}
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

  return { columns: OUTSIDE_BROKER_COLUMNS, renderCell };
}
