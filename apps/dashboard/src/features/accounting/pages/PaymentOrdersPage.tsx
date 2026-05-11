import { EditOutlined, EyeOutlined } from "@ant-design/icons";
import { useAntdTable, useRequest } from "ahooks";
import { Button, Card, Flex, Space, Table, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import type { AdvancedFilter, FilterField } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { getBranches } from "@/features/branch/api/branchApi";
import { renderCurrency, renderDate } from "@/utils/formatters";
import { paymentOrderApi } from "../api/paymentOrderApi";
import PaymentStatusTag from "../components/PaymentStatusTag";
import UpdatePaymentStatusModal from "../components/UpdatePaymentStatusModal";
import { usePaymentOrderModal } from "../hooks/usePaymentOrderModal";
import type { PaymentOrder } from "../types/paymentOrder";

const { Title } = Typography;

export default function PaymentOrdersPage() {
  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();
  const [activeQuery, setActiveQuery] = useState("");
  const { selectedOrder, open, mode, openModal, closeModal } = usePaymentOrderModal();

  const { data: branchesData } = useRequest(() => getBranches({ limit: 200 }), {
    cacheKey: "branches-for-filter",
  });

  const fields: FilterField[] = [
    {
      key: "branchId",
      label: "Branch",
      type: "select",
      options: branchesData?.branches.map((b) => ({ label: b.name, value: b.id })) ?? [],
      placeholder: "All branches",
    },
  ];

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize }) => {
      const res = await paymentOrderApi.list({
        page: (current ?? 1) - 1,
        limit: pageSize ?? 20,
        query: activeQuery || undefined,
        filters: activeFilter ? JSON.stringify(activeFilter) : undefined,
      });
      return { list: res.paymentOrders, total: res.total };
    },
    { refreshDeps: [activeQuery, activeFilter], defaultPageSize: 20 },
  );

  const handleFilterApply = (filter: AdvancedFilter | undefined, query: string | undefined) => {
    setActiveFilter(filter);
    setActiveQuery(query ?? "");
  };

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

  return (
    <>
      <Card>
        <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Payment Orders ({tableProps.pagination.total ?? 0})
          </Title>
          <AdvancedFilterPopover
            fields={fields}
            initialFilter={activeFilter}
            initialQuery={activeQuery}
            onApply={handleFilterApply}
          />
        </Flex>

        <ActiveFilterChips
          filter={activeFilter}
          fields={fields}
          query={activeQuery}
          onChange={setActiveFilter}
          onClearQuery={() => setActiveQuery("")}
        />

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
        open={open}
        mode={mode}
        onClose={closeModal}
        onSuccess={refresh}
      />
    </>
  );
}
