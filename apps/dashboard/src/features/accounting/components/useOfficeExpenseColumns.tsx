import { ActionsMenu } from "@/components/ActionsMenu";
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
  isRowHeader?: boolean;
}

export function useOfficeExpenseColumns(navigate: (path: string) => void): OfficeExpenseColumn[] {
  const canView = usePermission("office_expense_payment_order", "view");
  const canEdit = usePermission("office_expense_payment_order", "edit");

  const renderActions = (r: OfficeExpensePaymentOrder) => (
    <ActionsMenu
      actions={[
        {
          type: "edit",
          hidden: !canEdit,
          onAction: () => navigate(`office-expense/${r.id}?mode=edit`),
        },
        {
          type: "view",
          hidden: !canView,
          onAction: () => navigate(`office-expense/${r.id}`),
        },
      ]}
    />
  );

  return [
    {
      key: "serviceName",
      label: "Service",
      width: "w-44",
      isRowHeader: true,
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
