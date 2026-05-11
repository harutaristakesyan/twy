import { useRequest } from "ahooks";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import { renderCurrency } from "@/utils/formatters";
import { billingApi } from "../api/billingApi";
import PaymentStatusTag from "../components/PaymentStatusTag";
import type { ExternalBillingBranch, ExternalBillingLoad } from "../types/billing";

const renderDate = (v: string | null | undefined) =>
  v
    ? new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "—";

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
    render: renderCurrency,
  },
  {
    title: "Broker Received",
    dataIndex: "brokerReceivedAmount",
    key: "brokerReceivedAmount",
    width: 150,
    render: renderCurrency,
  },
  {
    title: "Broker Received Date",
    dataIndex: "brokerReceivedDate",
    key: "brokerReceivedDate",
    width: 170,
    render: renderDate,
  },
  {
    title: "Carrier Payable",
    dataIndex: "carrierPayable",
    key: "carrierPayable",
    width: 140,
    render: renderCurrency,
  },
  {
    title: "Carrier Paid",
    dataIndex: "carrierPaidAmount",
    key: "carrierPaidAmount",
    width: 120,
    render: renderCurrency,
  },
  {
    title: "Carrier Paid Date",
    dataIndex: "carrierPaidDate",
    key: "carrierPaidDate",
    width: 150,
    render: renderDate,
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

interface ApiParams {
  query?: string;
  filters?: string;
  [key: string]: string | undefined;
}

export function useExpandedLoads(apiParams: ApiParams) {
  const [loadsByBranch, setLoadsByBranch] = useState<Map<string, ExternalBillingLoad[]>>(new Map());
  const [expandingBranchId, setExpandingBranchId] = useState<string | null>(null);

  const resetLoads = () => setLoadsByBranch(new Map());

  const { runAsync: fetchLoads } = useRequest(billingApi.listExternalLoads, { manual: true });

  const onExpand = async (expanded: boolean, record: ExternalBillingBranch) => {
    if (!expanded || loadsByBranch.has(record.branchId)) return;
    setExpandingBranchId(record.branchId);
    try {
      const loads = await fetchLoads(record.branchId, apiParams);
      setLoadsByBranch((prev) => new Map(prev).set(record.branchId, loads));
    } finally {
      setExpandingBranchId(null);
    }
  };

  const expandedRowRender = (record: ExternalBillingBranch) => (
    <Table<ExternalBillingLoad>
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
