import { EditOutlined, EyeOutlined, FilterOutlined } from "@ant-design/icons";
import { useAntdTable, useRequest } from "ahooks";
import { Badge, Button, Card, Flex, Space, Table, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useState } from "react";
import type { AdvancedFilter, QuickFilterField } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { getBranches } from "@/features/branch/api/branchApi";
import { paymentOrderApi } from "../api/paymentOrderApi";
import PaymentStatusTag from "../components/PaymentStatusTag";
import UpdatePaymentStatusModal from "../components/UpdatePaymentStatusModal";
import type { PaymentOrder } from "../types/paymentOrder";

type ModalMode = "edit" | "view";

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
  const [modalMode, setModalMode] = useState<ModalMode>("edit");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();

  const { data: branchesData } = useRequest(() => getBranches({ limit: 200 }), {
    cacheKey: "branches-for-filter",
  });

  const branchOptions = branchesData?.branches.map((b) => ({ label: b.name, value: b.id })) ?? [];

  const quickFields: QuickFilterField[] = [
    {
      key: "branchId",
      label: "Branch",
      type: "select",
      options: branchOptions,
      placeholder: "All branches",
    },
  ];

  const activeBranchId = activeFilter?.rules.find((r) => r.field === "branchId")?.value;
  const isFilterActive = !!activeBranchId;

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize }) => {
      const res = await paymentOrderApi.list({
        page: (current ?? 1) - 1,
        limit: pageSize ?? 20,
        branchId: activeBranchId,
      });
      return { list: res.paymentOrders, total: res.total };
    },
    { refreshDeps: [activeBranchId], defaultPageSize: 20 },
  );

  const openModal = useCallback((record: PaymentOrder, mode: ModalMode) => {
    setSelectedOrder(record);
    setModalMode(mode);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleSuccess = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleFilterApply = useCallback((filter: AdvancedFilter | undefined) => {
    setActiveFilter(filter);
  }, []);

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
          <Badge count={isFilterActive ? 1 : 0} size="small">
            <Space.Compact>
              <AdvancedFilterPopover
                open={popoverOpen}
                title="Filter — Payment Orders"
                quickFields={quickFields}
                ruleFields={[]}
                initialFilter={activeFilter}
                onApply={handleFilterApply}
                onClose={() => setPopoverOpen(false)}
              >
                <Button
                  icon={<FilterOutlined />}
                  type={isFilterActive ? "primary" : "default"}
                  onClick={() => setPopoverOpen(true)}
                >
                  Filter
                </Button>
              </AdvancedFilterPopover>
              {isFilterActive && (
                <Button
                  type="primary"
                  onClick={() => setActiveFilter(undefined)}
                  title="Clear filters"
                >
                  ×
                </Button>
              )}
            </Space.Compact>
          </Badge>
        </Flex>

        <ActiveFilterChips
          filter={activeFilter}
          quickFields={quickFields}
          ruleFields={[]}
          onChange={setActiveFilter}
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
        open={modalOpen}
        mode={modalMode}
        onClose={closeModal}
        onSuccess={handleSuccess}
      />
    </>
  );
}
