import { useRequest } from "ahooks";
import { Card, DatePicker, Flex, Select, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import type React from "react";
import { useCallback, useState } from "react";
import { getBranches } from "@/features/branch/api/branchApi.ts";
import { formatCurrency } from "@/utils/formatters.ts";
import { billingApi } from "../api/billingApi.ts";
import type { ExternalBillingRow } from "../types/index.ts";

const { Title } = Typography;
const { RangePicker } = DatePicker;

const ExternalBillingTab: React.FC = () => {
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

  const fetchBilling = useCallback(
    () =>
      billingApi.getExternalBilling({
        branchId,
        dateFrom: dateRange?.[0]?.toISOString() ?? undefined,
        dateTo: dateRange?.[1]?.toISOString() ?? undefined,
      }),
    [branchId, dateRange],
  );

  const { data = [], loading } = useRequest(fetchBilling, {
    refreshDeps: [branchId, dateRange],
  });

  const columns: ColumnsType<ExternalBillingRow> = [
    { title: "Branch", dataIndex: "branchName", key: "branchName", width: 180 },
    {
      title: "Total Receivable",
      dataIndex: "totalReceivable",
      key: "totalReceivable",
      width: 160,
      render: (v: number) => formatCurrency(v),
    },
    {
      title: "Total Payable",
      dataIndex: "totalPayable",
      key: "totalPayable",
      width: 150,
      render: (v: number) => formatCurrency(v),
    },
    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      width: 130,
      render: (v: number) => (
        <span style={{ color: v >= 0 ? "#52c41a" : "#ff4d4f", fontWeight: 600 }}>
          {formatCurrency(v)}
        </span>
      ),
    },
  ];

  return (
    <Card>
      <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          External Billing
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
      <Table
        columns={columns}
        dataSource={data}
        rowKey="branchId"
        loading={loading}
        pagination={false}
        scroll={{ x: 650 }}
      />
    </Card>
  );
};

export default ExternalBillingTab;
