import { useAntdTable } from "ahooks";
import { Button, Card, Flex, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useState } from "react";
import { paymentOrderApi } from "../api/paymentOrderApi";
import PaymentStatusTag from "../components/PaymentStatusTag";
import UpdatePaymentStatusModal from "../components/UpdatePaymentStatusModal";
import type { PaymentOrder } from "../types/paymentOrder";

const { Title } = Typography;

const formatCurrency = (value: number | null | undefined): string =>
  value != null
    ? `€${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

const formatDate = (value: string | null | undefined): string =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

export default function PaymentOrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrder | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize }) => {
      const res = await paymentOrderApi.list({ page: (current ?? 1) - 1, limit: pageSize ?? 20 });
      return { list: res.paymentOrders, total: res.total };
    },
    { defaultPageSize: 20 },
  );

  const openModal = useCallback((record: PaymentOrder) => {
    setSelectedOrder(record);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleSuccess = useCallback(() => {
    refresh();
  }, [refresh]);

  const columns: ColumnsType<PaymentOrder> = [
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
      render: formatCurrency,
    },
    {
      title: "Carrier Payable",
      dataIndex: "carrierPayable",
      key: "carrierPayable",
      width: 140,
      render: (v: number) => formatCurrency(v),
    },
    {
      title: "Service Fee",
      dataIndex: "serviceFee",
      key: "serviceFee",
      width: 120,
      render: (v: number) => formatCurrency(v),
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
      render: formatCurrency,
    },
    {
      title: "Profit",
      dataIndex: "profit",
      key: "profit",
      width: 120,
      render: formatCurrency,
    },
    {
      title: "Carrier Paid",
      dataIndex: "carrierPaidAmount",
      key: "carrierPaidAmount",
      width: 130,
      render: formatCurrency,
    },
    {
      title: "Carrier Paid Date",
      dataIndex: "carrierPaidDate",
      key: "carrierPaidDate",
      width: 140,
      render: formatDate,
    },
    {
      title: "Broker Received",
      dataIndex: "brokerReceivedAmount",
      key: "brokerReceivedAmount",
      width: 140,
      render: formatCurrency,
    },
    {
      title: "Broker Received Date",
      dataIndex: "brokerReceivedDate",
      key: "brokerReceivedDate",
      width: 160,
      render: formatDate,
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
      render: formatDate,
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 80,
      render: (_: unknown, record: PaymentOrder) => (
        <Button size="small" onClick={() => openModal(record)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card>
        <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Payment Orders ({tableProps.pagination.total ?? 0})
          </Title>
        </Flex>
        <Table<PaymentOrder>
          {...tableProps}
          columns={columns}
          rowKey="id"
          scroll={{ x: 2000 }}
          size="middle"
        />
      </Card>

      <UpdatePaymentStatusModal
        paymentOrder={selectedOrder}
        open={modalOpen}
        onClose={closeModal}
        onSuccess={handleSuccess}
      />
    </>
  );
}
