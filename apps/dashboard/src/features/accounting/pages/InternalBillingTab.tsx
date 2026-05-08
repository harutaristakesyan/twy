import { FilterOutlined } from "@ant-design/icons";
import { useAntdTable, useRequest } from "ahooks";
import { Badge, Button, Card, DatePicker, Flex, Select, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import type React from "react";
import { useCallback, useState } from "react";
import type { AdvancedFilter } from "@/components/AdvancedFilter";
import { AdvancedFilterDrawer } from "@/components/AdvancedFilter";
import { getBranches } from "@/features/branch/api/branchApi.ts";
import { LOAD_FILTER_FIELDS } from "@/features/load/constants/loadAdvancedFilterFields";
import { formatCurrency } from "@/utils/formatters.ts";
import { billingApi } from "../api/billingApi.ts";
import type { InternalBillingRow } from "../types/index.ts";

const { Title } = Typography;
const { RangePicker } = DatePicker;

const InternalBillingTab: React.FC = () => {
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();

  const isAdvFilterActive = (activeFilter?.rules?.length ?? 0) > 0;

  const activeRuleCount = activeFilter?.rules?.length ?? 0;

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
      const hasAdvFilter = (activeFilter?.rules?.length ?? 0) > 0;
      const result = await billingApi.getInternalBilling({
        page: current - 1,
        limit: pageSize,
        branchId,
        dateFrom: dateRange?.[0]?.toISOString() ?? undefined,
        dateTo: dateRange?.[1]?.toISOString() ?? undefined,
        filters: hasAdvFilter ? JSON.stringify(activeFilter) : undefined,
      });
      return { total: result.total, list: result.rows };
    },
    [branchId, dateRange, activeFilter],
  );

  const { tableProps } = useAntdTable(fetchData, {
    refreshDeps: [branchId, dateRange, activeFilter],
    defaultPageSize: 10,
  });

  const handleFilterApply = (filter: AdvancedFilter) => {
    setActiveFilter(filter.rules.length > 0 ? filter : undefined);
    setFilterDrawerOpen(false);
  };

  const columns: ColumnsType<InternalBillingRow> = [
    {
      title: "Reference #",
      dataIndex: "referenceNumber",
      key: "referenceNumber",
      width: 130,
      fixed: "left",
      render: (text: string) => <strong>{text}</strong>,
    },
    { title: "Branch", dataIndex: "branchName", key: "branchName", width: 160 },
    {
      title: "Service Fee",
      dataIndex: "serviceFee",
      key: "serviceFee",
      width: 120,
      render: (v: number | null) => formatCurrency(v),
    },
    {
      title: "Income %",
      dataIndex: "incomePercentage",
      key: "incomePercentage",
      width: 100,
      render: (v: number | null) => (v !== null ? `${v.toFixed(2)}%` : "—"),
    },
    {
      title: "Charges",
      dataIndex: "charges",
      key: "charges",
      width: 110,
      render: (v: number | null) => formatCurrency(v),
    },
    {
      title: "Profit",
      dataIndex: "profit",
      key: "profit",
      width: 110,
      render: (v: number | null) => formatCurrency(v),
    },
  ];

  return (
    <Card>
      <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Internal Billing ({tableProps.pagination.total ?? 0})
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
          <Badge count={isAdvFilterActive ? activeRuleCount : 0} size="small">
            <Space.Compact>
              <Button
                icon={<FilterOutlined />}
                type={isAdvFilterActive ? "primary" : "default"}
                onClick={() => setFilterDrawerOpen(true)}
              >
                Advanced Search
              </Button>
              {isAdvFilterActive && (
                <Button type="primary" onClick={() => setActiveFilter(undefined)} title="Clear">
                  ×
                </Button>
              )}
            </Space.Compact>
          </Badge>
        </Flex>
      </Flex>
      <Table columns={columns} rowKey="loadId" scroll={{ x: 800 }} {...tableProps} />

      <AdvancedFilterDrawer
        open={filterDrawerOpen}
        title="Load filters — Internal Billing"
        fields={LOAD_FILTER_FIELDS}
        initialFilter={activeFilter}
        onApply={handleFilterApply}
        onClose={() => setFilterDrawerOpen(false)}
      />
    </Card>
  );
};

export default InternalBillingTab;
