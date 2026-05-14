import { BankOutlined, UserOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import { Flex, Spin, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ReactNode } from "react";
import { useMemo } from "react";
import type { AdvancedFilter } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { formatCurrency, renderCurrency } from "@/utils/formatters";
import { billingApi } from "../api/billingApi";
import type { ExternalBillingUserGroup } from "../hooks/groupLoadsByCreator";
import { useBillingFilters } from "../hooks/useBillingFilters";
import { type ExternalBillingTreeBranchData, useExpandedLoads } from "../hooks/useExpandedLoads";
import type { ExternalBillingBranch, ExternalBillingLoad } from "../types/billing";
import PaymentStatusTag from "./PaymentStatusTag";

const { Title, Text } = Typography;

interface RowView {
  key: string;
  rowType: "branch" | "user" | "load" | "placeholder";
  branchId: string;
  label: ReactNode;
  loadCount: number | null;
  brokerReceivable: number | null;
  brokerReceived: number | null;
  carrierPayable: number | null;
  carrierPaid: number | null;
  owed: number;
  status: ReactNode;
  children?: RowView[];
}

// AntD tree-mode <Table> only renders an expand chevron when `children` is non-empty.
// Until the user expands a branch (and we fetch its loads), we attach a single placeholder
// child so the chevron stays visible. The placeholder is swapped for the real tree on fetch.
const placeholderChild = (branchId: string): RowView => ({
  key: `branch-${branchId}/placeholder`,
  rowType: "placeholder",
  branchId,
  label: (
    <Flex align="center" gap={8}>
      <Spin size="small" />
      <Text type="secondary">Loading…</Text>
    </Flex>
  ),
  loadCount: null,
  brokerReceivable: null,
  brokerReceived: null,
  carrierPayable: null,
  carrierPaid: null,
  owed: 0,
  status: null,
});

const renderOwed = (v: number): ReactNode => (
  <Text strong style={{ color: v > 0 ? "#cf1322" : "#389e0d" }}>
    {formatCurrency(v)}
  </Text>
);

const columns: ColumnsType<RowView> = [
  {
    title: "Branch / User / Load",
    dataIndex: "label",
    key: "label",
  },
  {
    title: "Loads",
    dataIndex: "loadCount",
    key: "loadCount",
    width: 80,
    render: (v: number | null) => v ?? null,
  },
  {
    title: "Broker Receivable",
    dataIndex: "brokerReceivable",
    key: "brokerReceivable",
    width: 160,
    render: renderCurrency,
  },
  {
    title: "Broker Received",
    dataIndex: "brokerReceived",
    key: "brokerReceived",
    width: 160,
    render: renderCurrency,
  },
  {
    title: "Carrier Payable",
    dataIndex: "carrierPayable",
    key: "carrierPayable",
    width: 150,
    render: renderCurrency,
  },
  {
    title: "Carrier Paid",
    dataIndex: "carrierPaid",
    key: "carrierPaid",
    width: 130,
    render: renderCurrency,
  },
  {
    title: "Owed to Branch",
    dataIndex: "owed",
    key: "owed",
    width: 150,
    render: (v: number) => renderOwed(v),
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    width: 140,
  },
];

const buildLoadView = (branchId: string, userKey: string, load: ExternalBillingLoad): RowView => ({
  key: `branch-${branchId}/user-${userKey}/load-${load.loadId}`,
  rowType: "load",
  branchId,
  label: (
    <span style={{ paddingLeft: 8 }}>
      <strong>{load.referenceNumber}</strong>
      {load.carrierName ? <Text type="secondary"> · {load.carrierName}</Text> : null}
    </span>
  ),
  loadCount: null,
  brokerReceivable: load.brokerReceivable,
  brokerReceived: load.brokerReceivedAmount,
  carrierPayable: load.carrierPayable,
  carrierPaid: load.carrierPaidAmount,
  owed: load.carrierPayable - (load.carrierPaidAmount ?? 0),
  status: <PaymentStatusTag status={load.paymentStatus} />,
});

const buildUserView = (branchId: string, group: ExternalBillingUserGroup): RowView => {
  const userKey = group.userId ?? "unknown";
  const dim = group.userId === null;
  return {
    key: `branch-${branchId}/user-${userKey}`,
    rowType: "user",
    branchId,
    label: (
      <Text type={dim ? "secondary" : undefined}>
        <UserOutlined style={{ marginRight: 6 }} />
        {group.userName}
      </Text>
    ),
    loadCount: group.loadCount,
    brokerReceivable: group.totalBrokerReceivable,
    brokerReceived: group.totalBrokerReceived,
    carrierPayable: group.totalCarrierPayable,
    carrierPaid: group.totalCarrierPaid,
    owed: group.owedToBranch,
    status: null,
    children: group.loads.map((l) => buildLoadView(branchId, userKey, l)),
  };
};

const buildBranchView = (
  branch: ExternalBillingBranch,
  data: ExternalBillingTreeBranchData | undefined,
): RowView => ({
  key: `branch-${branch.branchId}`,
  rowType: "branch",
  branchId: branch.branchId,
  label: (
    <strong>
      <BankOutlined style={{ marginRight: 6 }} />
      {branch.branchName}
    </strong>
  ),
  loadCount: branch.loadCount,
  brokerReceivable: branch.totalBrokerReceivable,
  brokerReceived: branch.totalBrokerReceived,
  carrierPayable: branch.totalCarrierPayable,
  carrierPaid: branch.totalCarrierPaid,
  owed: branch.owedToBranch,
  status: null,
  children: data
    ? data.userGroups.map((g) => buildUserView(branch.branchId, g))
    : [placeholderChild(branch.branchId)],
});

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
  const { onExpand, resetLoads, loadsByBranch } = useExpandedLoads(apiParams);

  const onFilterApply = (filter: AdvancedFilter | undefined, query: string | undefined) => {
    handleFilterApply(filter, query);
    resetLoads();
  };

  const { data: branches, loading } = useRequest(() => billingApi.listExternalByBranch(apiParams), {
    refreshDeps: [apiParams],
  });

  const treeData = useMemo(
    () => (branches ?? []).map((b) => buildBranchView(b, loadsByBranch.get(b.branchId))),
    [branches, loadsByBranch],
  );

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

      <Table<RowView>
        loading={loading}
        dataSource={treeData}
        columns={columns}
        rowKey="key"
        pagination={false}
        expandable={{
          childrenColumnName: "children",
          onExpand: (expanded, row) => {
            if (row.rowType === "branch") onExpand(expanded, row.branchId);
          },
        }}
      />
    </>
  );
}
