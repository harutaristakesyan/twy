import { Eye, Pencil } from "@gravity-ui/icons";
import { useCallback } from "react";
import { usePermission } from "@/hooks/usePermission";
import { renderDate } from "@/utils/formatters";
import {
  type OfficeExpensePaymentOrder,
  type OfficeExpensePaymentStatus,
  type OfficeExpenseService,
  SERVICE_LABELS,
} from "../types/officeExpensePaymentOrder";
import PaymentStatusTag from "./PaymentStatusTag";

const CURRENCY_SYMBOL: Record<string, string> = { USD: "$", EUR: "€" };

const renderAmount = (amount: number, record: OfficeExpensePaymentOrder) =>
  `${CURRENCY_SYMBOL[record.currency] ?? ""}${amount.toFixed(2)}`;

const renderPeriod = (record: OfficeExpensePaymentOrder) =>
  record.periodStart === record.periodEnd
    ? renderDate(record.periodStart)
    : `${renderDate(record.periodStart)} – ${renderDate(record.periodEnd)}`;

export interface OfficeExpenseColumn {
  key: string;
  label: string;
  render: (record: OfficeExpensePaymentOrder) => React.ReactNode;
  width?: string;
}

export function useOfficeExpenseColumns(
  openDetail: (record: OfficeExpensePaymentOrder, mode: "view" | "edit") => void,
): OfficeExpenseColumn[] {
  const canEdit = usePermission("office_expense_payment_order", "edit");

  const renderActions = useCallback(
    (r: OfficeExpensePaymentOrder) => (
      <div className="flex items-center gap-1">
        {canEdit && (
          <button
            type="button"
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
            onClick={() => openDetail(r, "edit")}
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
          onClick={() => openDetail(r, "view")}
          title="View"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      </div>
    ),
    [canEdit, openDetail],
  );

  return [
    {
      key: "serviceName",
      label: "Service",
      width: "w-44",
      render: (r) => SERVICE_LABELS[r.serviceName as OfficeExpenseService],
    },
    {
      key: "paymentPurpose",
      label: "Payment Purpose",
      render: (r) => (
        <span className="block max-w-xs truncate" title={r.paymentPurpose}>
          {r.paymentPurpose}
        </span>
      ),
    },
    { key: "period", label: "Period", width: "w-44", render: (r) => renderPeriod(r) },
    {
      key: "amount",
      label: "Amount",
      width: "w-28",
      render: (r) => renderAmount(r.amount, r),
    },
    {
      key: "paymentStatus",
      label: "Status",
      width: "w-32",
      render: (r) => <PaymentStatusTag status={r.paymentStatus as OfficeExpensePaymentStatus} />,
    },
    {
      key: "createdAt",
      label: "Created",
      width: "w-28",
      render: (r) => renderDate(r.createdAt),
    },
    { key: "actions", label: "Actions", width: "w-20", render: (r) => renderActions(r) },
  ];
}
