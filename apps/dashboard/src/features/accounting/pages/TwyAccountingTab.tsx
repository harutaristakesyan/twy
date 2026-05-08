import { useAntdTable, useRequest } from "ahooks";
import { Button, Card, DatePicker, Flex, Select, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import type React from "react";
import { useCallback, useState } from "react";
import { getBranches } from "@/features/branch/api/branchApi.ts";
import { formatCurrency } from "@/utils/formatters.ts";
import { billingApi } from "../api/billingApi.ts";
import StatusTag from "../components/StatusTag.tsx";
import { useAccountingModal } from "../providers/AccountingModalProvider.tsx";
import type { BillingInvoiceSummary, InvoiceType, TwyAccountingRow } from "../types/index.ts";

const { Title } = Typography;
const { RangePicker } = DatePicker;

const TwyAccountingTab: React.FC = () => {
  const { openInvoiceModal, openPaymentModal } = useAccountingModal();
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const { data: branchesData, loading: branchesLoading } = useRequest(
    () => getBranches({ limit: 200 }),
    { cacheKey: "accounting-branches" },
  );

  const branchOptions = (branchesData?.branches ?? []).map((b) => ({
    value: b.id,
    label: b.name,
  }));

  const fetchData = useCallback(
    async ({ current, pageSize }: { current: number; pageSize: number }) => {
      const result = await billingApi.getTwyAccounting({
        page: current - 1,
        limit: pageSize,
        branchId,
        dateFrom: dateRange?.[0]?.toISOString() ?? undefined,
        dateTo: dateRange?.[1]?.toISOString() ?? undefined,
      });
      return { total: result.total, list: result.rows };
    },
    [branchId, dateRange],
  );

  const { tableProps, refresh } = useAntdTable(fetchData, {
    refreshDeps: [branchId, dateRange],
    defaultPageSize: 10,
  });

  const handleUploadInvoice = useCallback(
    (loadId: string, type: InvoiceType) => {
      openInvoiceModal(loadId, type, () => refresh());
    },
    [openInvoiceModal, refresh],
  );

  const handleMarkPaid = useCallback(
    (invoice: BillingInvoiceSummary) => {
      openPaymentModal(invoice, () => refresh());
    },
    [openPaymentModal, refresh],
  );

  const columns: ColumnsType<TwyAccountingRow> = [
    {
      title: "Reference #",
      dataIndex: "referenceNumber",
      key: "referenceNumber",
      width: 130,
      fixed: "left",
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Branch",
      dataIndex: "branchName",
      key: "branchName",
      width: 140,
      render: (text: string) => text,
    },
    {
      title: "Carrier",
      dataIndex: "carrier",
      key: "carrier",
      width: 130,
      render: (text: string | null) => text ?? "—",
    },
    {
      title: "Broker Receivable",
      dataIndex: "customerRate",
      key: "customerRate",
      width: 160,
      render: (value: number | null) => formatCurrency(value),
    },
    {
      title: "Carrier Payable",
      dataIndex: "carrierRate",
      key: "carrierRate",
      width: 140,
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "Service Fee",
      dataIndex: "serviceFee",
      key: "serviceFee",
      width: 120,
      render: (value: number | null) => formatCurrency(value),
    },
    {
      title: "Income %",
      dataIndex: "incomePercentage",
      key: "incomePercentage",
      width: 100,
      render: (value: number | null) => (value !== null ? `${value.toFixed(2)}%` : "—"),
    },
    {
      title: "Charges",
      dataIndex: "charges",
      key: "charges",
      width: 110,
      render: (value: number | null) => formatCurrency(value),
    },
    {
      title: "Profit",
      dataIndex: "profit",
      key: "profit",
      width: 110,
      render: (value: number | null) => formatCurrency(value),
    },
    {
      title: "Load Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: string) => <StatusTag kind="load" status={status} />,
    },
    {
      title: "Carrier Invoice",
      key: "carrierInvoice",
      width: 140,
      render: (_: unknown, record: TwyAccountingRow) =>
        record.carrierInvoice !== null ? (
          <StatusTag kind="invoice" status={record.carrierInvoice.status} />
        ) : (
          "—"
        ),
    },
    {
      title: "Broker Invoice",
      key: "brokerInvoice",
      width: 130,
      render: (_: unknown, record: TwyAccountingRow) =>
        record.brokerInvoice !== null ? (
          <StatusTag kind="invoice" status={record.brokerInvoice.status} />
        ) : (
          "—"
        ),
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 280,
      render: (_: unknown, record: TwyAccountingRow) => (
        <Space size="small" wrap>
          {record.carrierInvoice === null && (
            <Button size="small" onClick={() => handleUploadInvoice(record.loadId, "carrier")}>
              + Carrier Invoice
            </Button>
          )}
          {record.brokerInvoice === null && (
            <Button size="small" onClick={() => handleUploadInvoice(record.loadId, "broker")}>
              + Broker Invoice
            </Button>
          )}
          {record.carrierInvoice !== null && (
            <Button
              size="small"
              type="primary"
              onClick={() => {
                if (record.carrierInvoice !== null) handleMarkPaid(record.carrierInvoice);
              }}
            >
              Carrier Paid
            </Button>
          )}
          {record.brokerInvoice !== null && (
            <Button
              size="small"
              type="primary"
              onClick={() => {
                if (record.brokerInvoice !== null) handleMarkPaid(record.brokerInvoice);
              }}
            >
              Broker Paid
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          TWY Accounting ({tableProps.pagination.total ?? 0})
        </Title>
        <Flex align="middle" gap="middle" wrap>
          <Select
            placeholder="Filter by branch"
            allowClear
            style={{ width: 200 }}
            loading={branchesLoading}
            options={branchOptions}
            value={branchId}
            onChange={(val) => setBranchId(val)}
          />
          <RangePicker onChange={(range) => setDateRange(range)} allowClear />
        </Flex>
      </Flex>
      <Table columns={columns} rowKey="loadId" scroll={{ x: 1600 }} {...tableProps} />
    </Card>
  );
};

export default TwyAccountingTab;
