import { EditOutlined, EyeOutlined } from "@ant-design/icons";
import { Button, Space, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { renderCurrency, renderDate } from "@/utils/formatters";
import type { PaymentOrder } from "../types/paymentOrder";
import PaymentStatusTag from "./PaymentStatusTag";

export function useLoadPaymentOrderColumns(
  openModal: (record: PaymentOrder, mode: "edit" | "view") => void,
): ColumnsType<PaymentOrder> {
  return [
    {
      title: "Reference",
      dataIndex: "referenceNumber",
      key: "referenceNumber",
      width: 140,
      fixed: "left",
      render: (text: string) => <strong>{text}</strong>,
    },
    { title: "Branch", dataIndex: "branchName", key: "branchName", width: 140 },
    {
      title: "Carrier",
      dataIndex: "carrierName",
      key: "carrierName",
      width: 160,
      render: (v: string | null) => v ?? "—",
    },
    {
      title: "Broker Receivable",
      dataIndex: "brokerReceivable",
      key: "brokerReceivable",
      width: 150,
      render: renderCurrency,
    },
    {
      title: "Carrier Payable",
      dataIndex: "carrierPayable",
      key: "carrierPayable",
      width: 140,
      render: renderCurrency,
    },
    {
      title: "Service Fee",
      dataIndex: "serviceFee",
      key: "serviceFee",
      width: 120,
      render: renderCurrency,
    },
    {
      title: "Income %",
      dataIndex: "incomePercentage",
      key: "incomePercentage",
      width: 110,
      render: (v: number | null) => (v != null ? `${v.toFixed(2)}%` : "—"),
    },
    {
      title: "Charges",
      dataIndex: "charges",
      key: "charges",
      width: 110,
      render: renderCurrency,
    },
    {
      title: "Profit",
      dataIndex: "profit",
      key: "profit",
      width: 120,
      render: renderCurrency,
    },
    {
      title: "Carrier Paid",
      dataIndex: "carrierPaidAmount",
      key: "carrierPaidAmount",
      width: 130,
      render: renderCurrency,
    },
    {
      title: "Carrier Paid Date",
      dataIndex: "carrierPaidDate",
      key: "carrierPaidDate",
      width: 140,
      render: renderDate,
    },
    {
      title: "Broker Received",
      dataIndex: "brokerReceivedAmount",
      key: "brokerReceivedAmount",
      width: 140,
      render: renderCurrency,
    },
    {
      title: "Broker Received Date",
      dataIndex: "brokerReceivedDate",
      key: "brokerReceivedDate",
      width: 160,
      render: renderDate,
    },
    {
      title: "Invoices",
      dataIndex: "invoices",
      key: "invoices",
      width: 90,
      align: "center",
      render: (invoices: PaymentOrder["invoices"]) =>
        invoices?.length > 0 ? `${invoices.length} file${invoices.length > 1 ? "s" : ""}` : "—",
    },
    {
      title: "Payment Status",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      width: 150,
      render: (_: unknown, record: PaymentOrder) => (
        <PaymentStatusTag status={record.paymentStatus} />
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 130,
      render: renderDate,
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 100,
      render: (_: unknown, record: PaymentOrder) => (
        <Space>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => openModal(record, "edit")} />
          </Tooltip>
          <Tooltip title="View">
            <Button type="text" icon={<EyeOutlined />} onClick={() => openModal(record, "view")} />
          </Tooltip>
        </Space>
      ),
    },
  ];
}
