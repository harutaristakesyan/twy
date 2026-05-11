import { useRequest } from "ahooks";
import { Card, Flex, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AdvancedFilter } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { formatCurrency, formatPercent, renderCurrency } from "@/utils/formatters";
import { billingApi } from "../api/billingApi";
import { useBillingFilters } from "../hooks/useBillingFilters";
import { useInternalExpandedLoads } from "../hooks/useInternalExpandedLoads";
import type { InternalBillingBranch } from "../types/billing";

const { Title, Text } = Typography;

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
    render: renderCurrency,
  },
  {
    title: "Total Charges",
    dataIndex: "totalCharges",
    key: "totalCharges",
    width: 130,
    render: renderCurrency,
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

export default function InternalBillingPage() {
  const {
    activeFilter,
    activeQuery,
    apiParams,
    fields,
    handleFilterApply,
    setActiveFilter,
    setActiveQuery,
  } = useBillingFilters();
  const { onExpand, expandedRowRender, resetLoads } = useInternalExpandedLoads(apiParams);

  const onFilterApply = (filter: AdvancedFilter | undefined, query: string | undefined) => {
    handleFilterApply(filter, query);
    resetLoads();
  };

  const { data: branches, loading } = useRequest(() => billingApi.listInternalByBranch(apiParams), {
    refreshDeps: [apiParams],
  });

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
