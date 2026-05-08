import { useAntdTable, useRequest } from "ahooks";
import { Card, DatePicker, Flex, Select, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import type React from "react";
import { useCallback, useState } from "react";
import { getBranches } from "@/features/branch/api/branchApi.ts";
import { formatCurrency } from "@/utils/formatters.ts";
import { billingApi } from "../api/billingApi.ts";
import type { InternalBillingRow } from "../types/index.ts";

const { Title } = Typography;
const { RangePicker } = DatePicker;

const InternalBillingTab: React.FC = () => {
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
      const result = await billingApi.getInternalBilling({
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

  const { tableProps } = useAntdTable(fetchData, {
    refreshDeps: [branchId, dateRange],
    defaultPageSize: 10,
  });

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
        </Flex>
      </Flex>
      <Table columns={columns} rowKey="loadId" scroll={{ x: 800 }} {...tableProps} />
    </Card>
  );
};

export default InternalBillingTab;
