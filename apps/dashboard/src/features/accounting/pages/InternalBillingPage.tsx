import { useRequest } from "ahooks";
import { Button, Card, Flex, Popover, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useMemo, useState } from "react";
import type { AdvancedFilter, FilterField } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { getBranches } from "@/features/branch/api/branchApi";
import { getCarriers } from "@/features/carrier/api/carrierApi";
import { getOutsideBrokers } from "@/features/outside-broker/api/brokerApi";
import { fileApi } from "@/libs/fileApi";
import { billingApi } from "../api/billingApi";
import PaymentStatusTag from "../components/PaymentStatusTag";
import type { BillingInvoice, InternalBillingBranch, InternalBillingLoad } from "../types/billing";
import type { PaymentStatus } from "../types/paymentOrder";

const { Title, Text } = Typography;

const PAYMENT_STATUS_OPTIONS: Array<{ label: string; value: PaymentStatus }> = [
  { label: "Pending", value: "Pending" },
  { label: "Approved", value: "Approved" },
  { label: "Approved Paid", value: "ApprovedPaid" },
  { label: "Declined / Hold", value: "DeclinedHold" },
  { label: "Partial Paid", value: "PartialPaid" },
];

const formatCurrency = (value: number | null | undefined): string =>
  value != null
    ? `€${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

const formatPercent = (value: number | null | undefined): string =>
  value != null ? `${value.toFixed(2)}%` : "—";

const outerColumns: ColumnsType<InternalBillingBranch> = [
  {
    title: "Branch",
    dataIndex: "branchName",
    key: "branchName",
    render: (name: string) => <strong>{name}</strong>,
  },
  { title: "Loads", dataIndex: "loadCount", key: "loadCount", width: 80 },
  {
    title: "Total Service Fee",
    dataIndex: "totalServiceFee",
    key: "totalServiceFee",
    width: 150,
    render: formatCurrency,
  },
  {
    title: "Total Charges",
    dataIndex: "totalCharges",
    key: "totalCharges",
    width: 130,
    render: formatCurrency,
  },
  {
    title: "Avg Income %",
    dataIndex: "avgIncomePercentage",
    key: "avgIncomePercentage",
    width: 130,
    render: formatPercent,
  },
  {
    title: "Total Profit",
    dataIndex: "totalProfit",
    key: "totalProfit",
    width: 130,
    render: (v: number) => (
      <Text strong style={{ color: v >= 0 ? "#389e0d" : "#cf1322" }}>
        {formatCurrency(v)}
      </Text>
    ),
  },
];

const InvoicesCell = ({ invoices }: { invoices: BillingInvoice[] }) => {
  if (invoices.length === 0) return <span>—</span>;

  const content = (
    <Space direction="vertical" size={4}>
      {invoices.map((inv) => (
        <Button
          key={inv.fileId}
          type="link"
          size="small"
          style={{ padding: 0, height: "auto" }}
          onClick={() => fileApi.downloadFile(inv.fileId, inv.fileName)}
        >
          {inv.fileName}
        </Button>
      ))}
    </Space>
  );

  return (
    <Popover content={content} title="Invoices" trigger="click" placement="left">
      <Button type="link" size="small" style={{ padding: 0 }}>
        {invoices.length} file{invoices.length > 1 ? "s" : ""}
      </Button>
    </Popover>
  );
};

const innerColumns: ColumnsType<InternalBillingLoad> = [
  {
    title: "Reference",
    dataIndex: "referenceNumber",
    key: "referenceNumber",
    width: 140,
    render: (text: string) => <strong>{text}</strong>,
  },
  {
    title: "Carrier",
    dataIndex: "carrierName",
    key: "carrierName",
    width: 160,
    render: (v: string | null) => v ?? "—",
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
    render: formatPercent,
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
    render: (v: number | null) => (
      <Text style={{ color: v != null && v >= 0 ? "#389e0d" : "#cf1322" }}>
        {formatCurrency(v)}
      </Text>
    ),
  },
  {
    title: "Status",
    dataIndex: "paymentStatus",
    key: "paymentStatus",
    width: 140,
    render: (_: unknown, record: InternalBillingLoad) => (
      <PaymentStatusTag status={record.paymentStatus} />
    ),
  },
  {
    title: "Invoices",
    dataIndex: "invoices",
    key: "invoices",
    width: 100,
    render: (invoices: BillingInvoice[]) => <InvoicesCell invoices={invoices} />,
  },
];

export default function InternalBillingPage() {
  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();
  const [activeQuery, setActiveQuery] = useState("");
  const [loadsByBranch, setLoadsByBranch] = useState<Map<string, InternalBillingLoad[]>>(new Map());
  const [expandingBranchId, setExpandingBranchId] = useState<string | null>(null);

  const { data: branchesData } = useRequest(() => getBranches({ limit: 200 }), {
    cacheKey: "branches-for-filter",
  });
  const { data: carriersData } = useRequest(() => getCarriers({ kind: "outside", limit: 200 }), {
    cacheKey: "carriers-outside-for-filter",
  });
  const { data: brokersData } = useRequest(() => getOutsideBrokers({ limit: 200 }), {
    cacheKey: "brokers-for-filter",
  });

  const fields: FilterField[] = [
    {
      key: "branchId",
      label: "Branch",
      type: "select",
      options: branchesData?.branches.map((b) => ({ label: b.name, value: b.id })) ?? [],
      placeholder: "All branches",
    },
    { key: "createdAt", label: "Date Range", type: "dateRange" },
    {
      key: "status",
      label: "Status",
      type: "multiSelect",
      options: PAYMENT_STATUS_OPTIONS,
    },
    {
      key: "broker",
      label: "Broker",
      type: "select",
      options:
        brokersData?.brokers.map((b) => ({ label: b.brokerName, value: b.brokerName })) ?? [],
      placeholder: "All brokers",
    },
    {
      key: "carrierId",
      label: "Carrier",
      type: "select",
      options: carriersData?.carriers.map((c) => ({ label: c.carrierName, value: c.id })) ?? [],
      placeholder: "All carriers",
    },
  ];

  const apiParams = useMemo(
    () => ({
      query: activeQuery || undefined,
      filters: activeFilter ? JSON.stringify(activeFilter) : undefined,
    }),
    [activeFilter, activeQuery],
  );

  const { data: branches, loading } = useRequest(() => billingApi.listInternalByBranch(apiParams), {
    refreshDeps: [apiParams],
  });

  const { runAsync: fetchLoads } = useRequest(billingApi.listInternalLoads, { manual: true });

  const handleFilterApply = useCallback(
    (filter: AdvancedFilter | undefined, query: string | undefined) => {
      setActiveFilter(filter);
      setActiveQuery(query ?? "");
      setLoadsByBranch(new Map());
    },
    [],
  );

  const onExpand = useCallback(
    async (expanded: boolean, record: InternalBillingBranch) => {
      if (!expanded || loadsByBranch.has(record.branchId)) return;
      setExpandingBranchId(record.branchId);
      try {
        const loads = await fetchLoads(record.branchId, apiParams);
        setLoadsByBranch((prev) => new Map(prev).set(record.branchId, loads));
      } finally {
        setExpandingBranchId(null);
      }
    },
    [fetchLoads, loadsByBranch, apiParams],
  );

  const expandedRowRender = useCallback(
    (record: InternalBillingBranch) => (
      <Table<InternalBillingLoad>
        size="small"
        loading={expandingBranchId === record.branchId}
        dataSource={loadsByBranch.get(record.branchId) ?? []}
        columns={innerColumns}
        rowKey="loadId"
        pagination={false}
        style={{ margin: "8px 0" }}
      />
    ),
    [expandingBranchId, loadsByBranch],
  );

  return (
    <Card>
      <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Internal Billing
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

      <Table<InternalBillingBranch>
        loading={loading}
        dataSource={branches ?? []}
        columns={outerColumns}
        rowKey="branchId"
        expandable={{ expandedRowRender, onExpand }}
        pagination={false}
      />
    </Card>
  );
}
