import { useRequest } from "ahooks";
import { Button, Card, Flex, Popover, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useState } from "react";
import { fileApi } from "@/libs/fileApi";
import { billingApi } from "../api/billingApi";
import PaymentStatusTag from "../components/PaymentStatusTag";
import type { BillingInvoice, InternalBillingBranch, InternalBillingLoad } from "../types/billing";

const { Title, Text } = Typography;

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
  const [loadsByBranch, setLoadsByBranch] = useState<Map<string, InternalBillingLoad[]>>(new Map());
  const [expandingBranchId, setExpandingBranchId] = useState<string | null>(null);

  const { data: branches, loading } = useRequest(billingApi.listInternalByBranch, {
    cacheKey: "internal-billing-branches",
  });

  const { runAsync: fetchLoads } = useRequest(billingApi.listInternalLoads, { manual: true });

  const onExpand = useCallback(
    async (expanded: boolean, record: InternalBillingBranch) => {
      if (!expanded || loadsByBranch.has(record.branchId)) return;
      setExpandingBranchId(record.branchId);
      try {
        const loads = await fetchLoads(record.branchId);
        setLoadsByBranch((prev) => new Map(prev).set(record.branchId, loads));
      } finally {
        setExpandingBranchId(null);
      }
    },
    [fetchLoads, loadsByBranch],
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

  const totals = (branches ?? []).reduce(
    (acc, b) => ({
      totalServiceFee: acc.totalServiceFee + b.totalServiceFee,
      totalCharges: acc.totalCharges + b.totalCharges,
      totalProfit: acc.totalProfit + b.totalProfit,
    }),
    { totalServiceFee: 0, totalCharges: 0, totalProfit: 0 },
  );

  return (
    <Card>
      <Flex justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Internal Billing
        </Title>
      </Flex>

      <Table<InternalBillingBranch>
        loading={loading}
        dataSource={branches ?? []}
        columns={outerColumns}
        rowKey="branchId"
        expandable={{ expandedRowRender, onExpand }}
        pagination={false}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={2}>
              <Text strong>Total</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2}>
              <Text strong>{formatCurrency(totals.totalServiceFee)}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3}>
              <Text strong>{formatCurrency(totals.totalCharges)}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4} />
            <Table.Summary.Cell index={5}>
              <Text strong style={{ color: totals.totalProfit >= 0 ? "#389e0d" : "#cf1322" }}>
                {formatCurrency(totals.totalProfit)}
              </Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </Card>
  );
}
