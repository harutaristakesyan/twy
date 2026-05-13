import { useRequest } from "ahooks";
import { Flex, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AdvancedFilter } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { formatCurrency, renderCurrency } from "@/utils/formatters";
import { billingApi } from "../api/billingApi";
import { useBillingFilters } from "../hooks/useBillingFilters";
import { useExpandedLoads } from "../hooks/useExpandedLoads";
import type { ExternalBillingBranch } from "../types/billing";

const { Title, Text } = Typography;

const columns: ColumnsType<ExternalBillingBranch> = [
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
    render: renderCurrency,
  },
  {
    title: "Broker Received",
    dataIndex: "totalBrokerReceived",
    key: "totalBrokerReceived",
    width: 160,
    render: renderCurrency,
  },
  {
    title: "Carrier Payable",
    dataIndex: "totalCarrierPayable",
    key: "totalCarrierPayable",
    width: 150,
    render: renderCurrency,
  },
  {
    title: "Carrier Paid",
    dataIndex: "totalCarrierPaid",
    key: "totalCarrierPaid",
    width: 130,
    render: renderCurrency,
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

export default function ExternalBillingTable() {
  const {
    activeFilter,
    activeQuery,
    apiParams,
    fields,
    handleFilterApply,
    setActiveFilter,
    setActiveQuery,
  } = useBillingFilters();
  const { onExpand, expandedRowRender, resetLoads } = useExpandedLoads(apiParams);

  const onFilterApply = (filter: AdvancedFilter | undefined, query: string | undefined) => {
    handleFilterApply(filter, query);
    resetLoads();
  };

  const { data: branches, loading } = useRequest(() => billingApi.listExternalByBranch(apiParams), {
    refreshDeps: [apiParams],
  });

  return (
    <>
      <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          External Billing
        </Title>
        <AdvancedFilterPopover
          fields={fields}
          initialFilter={activeFilter}
          initialQuery={activeQuery}
          onApply={onFilterApply}
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
        columns={columns}
        rowKey="branchId"
        expandable={{ expandedRowRender, onExpand }}
        pagination={false}
      />
    </>
  );
}
