import { useRequest } from "ahooks";
import { Button, Flex, Popover, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import { FileDownloadButton } from "@/features/files";
import { formatPercent, renderCurrency } from "@/utils/formatters";
import { billingApi } from "../api/billingApi";
import PaymentStatusTag from "../components/PaymentStatusTag";
import type { BillingInvoice, InternalBillingBranch, InternalBillingLoad } from "../types/billing";

const InvoicesCell = ({ invoices }: { invoices: BillingInvoice[] }) => {
  if (invoices.length === 0) return <span>—</span>;

  const content = (
    <Flex vertical gap={4}>
      {invoices.map((inv) => (
        <FileDownloadButton
          key={inv.fileId}
          fileId={inv.fileId}
          fileName={inv.fileName}
          style={{ padding: 0, height: "auto" }}
        />
      ))}
    </Flex>
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
    render: renderCurrency,
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
    render: renderCurrency,
  },
  {
    title: "Profit",
    dataIndex: "profit",
    key: "profit",
    width: 120,
    render: (v: number | null) => renderCurrency(v),
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

interface ApiParams {
  query?: string;
  filters?: string;
  [key: string]: string | undefined;
}

export function useInternalExpandedLoads(apiParams: ApiParams) {
  const [loadsByBranch, setLoadsByBranch] = useState<Map<string, InternalBillingLoad[]>>(new Map());
  const [expandingBranchId, setExpandingBranchId] = useState<string | null>(null);

  const resetLoads = () => setLoadsByBranch(new Map());

  const { runAsync: fetchLoads } = useRequest(billingApi.listInternalLoads, { manual: true });

  const onExpand = async (expanded: boolean, record: InternalBillingBranch) => {
    if (!expanded || loadsByBranch.has(record.branchId)) return;
    setExpandingBranchId(record.branchId);
    try {
      const loads = await fetchLoads(record.branchId, apiParams);
      setLoadsByBranch((prev) => new Map(prev).set(record.branchId, loads));
    } finally {
      setExpandingBranchId(null);
    }
  };

  const expandedRowRender = (record: InternalBillingBranch) => (
    <Table<InternalBillingLoad>
      size="small"
      loading={expandingBranchId === record.branchId}
      dataSource={loadsByBranch.get(record.branchId) ?? []}
      columns={innerColumns}
      rowKey="loadId"
      pagination={false}
      style={{ margin: "8px 0" }}
    />
  );

  return { onExpand, expandedRowRender, resetLoads };
}
