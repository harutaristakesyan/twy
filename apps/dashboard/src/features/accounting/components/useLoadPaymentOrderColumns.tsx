import { ActionsMenu } from "@/components/ActionsMenu";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { renderCurrency, renderDate } from "@/utils/formatters";
import type { PaymentOrder, PaymentStatus } from "../types/paymentOrder";
import PaymentStatusTag, { STATUS_LABEL } from "./PaymentStatusTag";

const ALL_STATUSES = Object.keys(STATUS_LABEL) as PaymentStatus[];

export interface LoadPaymentOrderColumn {
  key: string;
  label: string;
  render: (record: PaymentOrder) => React.ReactNode;
  width?: string;
  isRowHeader?: boolean;
}

export function useLoadPaymentOrderColumns(
  navigate: (path: string) => void,
): LoadPaymentOrderColumn[] {
  const { permissions } = useCurrentUser();
  const canEdit = Boolean(permissions.load_payment_order?.edit);
  const transitions = permissions.load_payment_order as Record<string, boolean> | undefined;
  const canChangeStatus = ALL_STATUSES.some((s) => transitions?.[`transition:${s}`]);

  return [
    {
      key: "referenceNumber",
      label: "Reference",
      width: "w-32",
      isRowHeader: true,
      render: (r) => <strong>{r.referenceNumber}</strong>,
    },
    { key: "branchName", label: "Branch", width: "w-32", render: (r) => r.branchName },
    {
      key: "carrierName",
      label: "Carrier",
      width: "w-40",
      render: (r) => r.carrierName ?? "—",
    },
    {
      key: "brokerReceivable",
      label: "Broker Receivable",
      width: "w-36",
      render: (r) => renderCurrency(r.brokerReceivable),
    },
    {
      key: "carrierPayable",
      label: "Carrier Payable",
      width: "w-36",
      render: (r) => renderCurrency(r.carrierPayable),
    },
    {
      key: "serviceFee",
      label: "Service Fee",
      width: "w-28",
      render: (r) => renderCurrency(r.serviceFee),
    },
    {
      key: "incomePercentage",
      label: "Income %",
      width: "w-24",
      render: (r) => (r.incomePercentage != null ? `${r.incomePercentage.toFixed(2)}%` : "—"),
    },
    {
      key: "charges",
      label: "Charges",
      width: "w-24",
      render: (r) => renderCurrency(r.charges),
    },
    { key: "profit", label: "Profit", width: "w-28", render: (r) => renderCurrency(r.profit) },
    {
      key: "carrierPaidAmount",
      label: "Carrier Paid",
      width: "w-28",
      render: (r) => renderCurrency(r.carrierPaidAmount),
    },
    {
      key: "carrierPaidDate",
      label: "Carrier Paid Date",
      width: "w-36",
      render: (r) => renderDate(r.carrierPaidDate),
    },
    {
      key: "brokerReceivedAmount",
      label: "Broker Received",
      width: "w-36",
      render: (r) => renderCurrency(r.brokerReceivedAmount),
    },
    {
      key: "brokerReceivedDate",
      label: "Broker Received Date",
      width: "w-40",
      render: (r) => renderDate(r.brokerReceivedDate),
    },
    {
      key: "invoices",
      label: "Invoices",
      width: "w-20",
      render: (r) =>
        r.invoices?.length > 0
          ? `${r.invoices.length} file${r.invoices.length > 1 ? "s" : ""}`
          : "—",
    },
    {
      key: "paymentStatus",
      label: "Payment Status",
      width: "w-36",
      render: (r) => <PaymentStatusTag status={r.paymentStatus} />,
    },
    {
      key: "createdAt",
      label: "Created",
      width: "w-28",
      render: (r) => renderDate(r.createdAt),
    },
    {
      key: "actions",
      label: "Actions",
      width: "w-20",
      render: (r) => (
        <ActionsMenu
          actions={[
            { type: "edit", hidden: !canEdit, onAction: () => navigate(`${r.id}?mode=edit`) },
            { type: "view", onAction: () => navigate(`${r.id}`) },
            {
              type: "status",
              hidden: !canChangeStatus,
              onAction: () => navigate(`${r.id}/status`),
            },
          ]}
        />
      ),
    },
  ];
}
