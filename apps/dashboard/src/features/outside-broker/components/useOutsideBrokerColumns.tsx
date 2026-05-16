import { Chip } from "@heroui/react";
import { ActionsMenu } from "@/components/ActionsMenu";
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
  const renderCell = (broker: OutsideBroker, colId: string) => {
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
        return canEdit ? (
          <ActionsMenu
            actions={[
              { type: "edit", onAction: () => onEdit(broker) },
              { type: "delete", disabled: isDeleting, onAction: () => onDelete(broker.id) },
            ]}
          />
        ) : null;
      default:
        return null;
    }
  };

  return { columns: OUTSIDE_BROKER_COLUMNS, renderCell };
}
