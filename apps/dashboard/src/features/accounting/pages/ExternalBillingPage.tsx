import { useRequest } from "ahooks";
import { Card, Flex, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useMemo, useState } from "react";
import type { AdvancedFilter, FilterField } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { getBranches } from "@/features/branch/api/branchApi";
import { getCarriers } from "@/features/carrier/api/carrierApi";
import { getOutsideBrokers } from "@/features/outside-broker/api/brokerApi";
import { billingApi } from "../api/billingApi";
import PaymentStatusTag from "../components/PaymentStatusTag";
import type { ExternalBillingBranch, ExternalBillingLoad } from "../types/billing";
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

const formatDate = (value: string | null | undefined): string =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

const outerColumns: ColumnsType<ExternalBillingBranch> = [
  {
    title: "Branch",
    dataIndex: "branchName",
    key: "branchName",
    render: (name: string) => <strong>{name}</strong>,
  },
  { title: "Loads", dataIndex: "loadCount", key: "loadCount", width: 80 },
  {
    title: "Broker Receivable",
    dataIndex: "totalBrokerReceivable",
    key: "totalBrokerReceivable",
    width: 160,
    render: formatCurrency,
  },
  {
    title: "Broker Received",
    dataIndex: "totalBrokerReceived",
    key: "totalBrokerReceived",
    width: 160,
    render: formatCurrency,
  },
  {
    title: "Carrier Payable",
    dataIndex: "totalCarrierPayable",
    key: "totalCarrierPayable",
    width: 150,
    render: formatCurrency,
  },
  {
    title: "Carrier Paid",
    dataIndex: "totalCarrierPaid",
    key: "totalCarrierPaid",
    width: 130,
    render: formatCurrency,
  },
  {
    title: "Owed to Branch",
    dataIndex: "owedToBranch",
    key: "owedToBranch",
    width: 150,
    render: (v: number) => (
      <Text strong style={{ color: v > 0 ? "#cf1322" : "#389e0d" }}>
        {formatCurrency(v)}
      </Text>
    ),
  },
];

const innerColumns: ColumnsType<ExternalBillingLoad> = [
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
    title: "Broker Receivable",
    dataIndex: "brokerReceivable",
    key: "brokerReceivable",
    width: 150,
    render: formatCurrency,
  },
  {
    title: "Broker Received",
    dataIndex: "brokerReceivedAmount",
    key: "brokerReceivedAmount",
    width: 150,
    render: formatCurrency,
  },
  {
    title: "Broker Received Date",
    dataIndex: "brokerReceivedDate",
    key: "brokerReceivedDate",
    width: 170,
    render: formatDate,
  },
  {
    title: "Carrier Payable",
    dataIndex: "carrierPayable",
    key: "carrierPayable",
    width: 140,
    render: (v: number) => formatCurrency(v),
  },
  {
    title: "Carrier Paid",
    dataIndex: "carrierPaidAmount",
    key: "carrierPaidAmount",
    width: 120,
    render: formatCurrency,
  },
  {
    title: "Carrier Paid Date",
    dataIndex: "carrierPaidDate",
    key: "carrierPaidDate",
    width: 150,
    render: formatDate,
  },
  {
    title: "Status",
    dataIndex: "paymentStatus",
    key: "paymentStatus",
    width: 140,
    render: (_: unknown, record: ExternalBillingLoad) => (
      <PaymentStatusTag status={record.paymentStatus} />
    ),
  },
];

export default function ExternalBillingPage() {
  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();
  const [activeQuery, setActiveQuery] = useState("");
  const [loadsByBranch, setLoadsByBranch] = useState<Map<string, ExternalBillingLoad[]>>(new Map());
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

  const { data: branches, loading } = useRequest(() => billingApi.listExternalByBranch(apiParams), {
    refreshDeps: [apiParams],
  });

  const { runAsync: fetchLoads } = useRequest(billingApi.listExternalLoads, { manual: true });

  const handleFilterApply = useCallback(
    (filter: AdvancedFilter | undefined, query: string | undefined) => {
      setActiveFilter(filter);
      setActiveQuery(query ?? "");
      setLoadsByBranch(new Map());
    },
    [],
  );

  const onExpand = useCallback(
    async (expanded: boolean, record: ExternalBillingBranch) => {
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
    (record: ExternalBillingBranch) => (
      <Table<ExternalBillingLoad>
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
          External Billing
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

      <Table<ExternalBillingBranch>
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
