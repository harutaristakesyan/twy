import { EditOutlined, EyeOutlined } from "@ant-design/icons";
import { Button, Space, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
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

const renderPeriod = (_: unknown, record: OfficeExpensePaymentOrder) =>
  record.periodStart === record.periodEnd
    ? renderDate(record.periodStart)
    : `${renderDate(record.periodStart)} – ${renderDate(record.periodEnd)}`;

export function useOfficeExpenseColumns(
  openDetail: (record: OfficeExpensePaymentOrder, mode: "view" | "edit") => void,
): ColumnsType<OfficeExpensePaymentOrder> {
  const canEdit = usePermission("office_expense_payment_order", "edit");

  const renderActions = useCallback(
    (_: unknown, record: OfficeExpensePaymentOrder) => (
      <Space>
        {canEdit && (
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openDetail(record, "edit")}
            />
          </Tooltip>
        )}
        <Tooltip title="View">
          <Button type="text" icon={<EyeOutlined />} onClick={() => openDetail(record, "view")} />
        </Tooltip>
      </Space>
    ),
    [canEdit, openDetail],
  );

  return [
    {
      title: "Service",
      dataIndex: "serviceName",
      key: "serviceName",
      width: 180,
      render: (v: OfficeExpenseService) => SERVICE_LABELS[v],
    },
    {
      title: "Payment Purpose",
      dataIndex: "paymentPurpose",
      key: "paymentPurpose",
      ellipsis: true,
    },
    {
      title: "Period",
      key: "period",
      width: 200,
      render: renderPeriod,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 120,
      render: (v: number, record) => renderAmount(v, record),
    },
    {
      title: "Status",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      width: 130,
      render: (v: OfficeExpensePaymentStatus) => <PaymentStatusTag status={v} />,
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: renderDate,
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 100,
      render: renderActions,
    },
  ];
}
