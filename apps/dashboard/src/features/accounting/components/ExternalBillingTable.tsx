import { BankOutlined, UserOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import { Flex, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AdvancedFilter } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { formatCurrency, renderCurrency } from "@/utils/formatters";
import { billingApi } from "../api/billingApi";
import type { ExternalBillingUserGroup } from "../hooks/groupLoadsByCreator";
import { useBillingFilters } from "../hooks/useBillingFilters";
import { useExpandedLoads } from "../hooks/useExpandedLoads";
import type { ExternalBillingBranch, ExternalBillingLoad } from "../types/billing";
import PaymentStatusTag from "./PaymentStatusTag";

const { Title, Text } = Typography;

// ---------------------------------------------------------------------------
// Shared renderers
// ---------------------------------------------------------------------------

const renderDate = (v: string | null | undefined) =>
  v
    ? new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "—";

const renderOwed = (v: number) => (
  <Text strong style={{ color: v > 0 ? "#cf1322" : "#389e0d" }}>
    {formatCurrency(v)}
  </Text>
);

// ---------------------------------------------------------------------------
// Innermost: load table (one per user group). Keeps the original per-load columns.
// ---------------------------------------------------------------------------

const loadColumns: ColumnsType<ExternalBillingLoad> = [
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

const LoadTable = ({ loads }: { loads: ExternalBillingLoad[] }) => (
  <Table<ExternalBillingLoad>
    size="small"
    dataSource={loads}
    columns={loadColumns}
    rowKey="loadId"
    pagination={false}
    style={{ margin: "8px 0" }}
  />
);

// ---------------------------------------------------------------------------
// Middle: user table (one per branch). Each user row expands into a LoadTable.
// ---------------------------------------------------------------------------

const userColumns: ColumnsType<ExternalBillingUserGroup> = [
  {
    title: "User",
    dataIndex: "userName",
    key: "userName",
    render: (name: string, row) => (
      <Text type={row.userId === null ? "secondary" : undefined}>
        <UserOutlined style={{ marginRight: 6 }} />
        {name}
      </Text>
    ),
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
    render: (v: number) => renderOwed(v),
  },
];

const userRowKey = (g: ExternalBillingUserGroup) => g.userId ?? "unknown";

const UserTable = ({
  userGroups,
  loading,
}: {
  userGroups: ExternalBillingUserGroup[];
  loading?: boolean;
}) => (
  <Table<ExternalBillingUserGroup>
    size="small"
    loading={loading}
    dataSource={userGroups}
    columns={userColumns}
    rowKey={userRowKey}
    pagination={false}
    style={{ margin: "8px 0" }}
    expandable={{
      expandedRowRender: (user) => <LoadTable loads={user.loads} />,
      rowExpandable: (user) => user.loads.length > 0,
    }}
  />
);

// ---------------------------------------------------------------------------
// Outer: branch table. Each branch row expands into a UserTable.
// ---------------------------------------------------------------------------

const branchColumns: ColumnsType<ExternalBillingBranch> = [
  {
    title: "Branch",
    dataIndex: "branchName",
    key: "branchName",
    render: (name: string) => (
      <strong>
        <BankOutlined style={{ marginRight: 6 }} />
        {name}
      </strong>
    ),
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
    render: (v: number) => renderOwed(v),
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
  const { onExpand, resetLoads, loadsByBranch, expandingBranchId } = useExpandedLoads(apiParams);

  const onFilterApply = (filter: AdvancedFilter | undefined, query: string | undefined) => {
    handleFilterApply(filter, query);
    resetLoads();
  };

  const { data: branches, loading } = useRequest(() => billingApi.listExternalByBranch(apiParams), {
    refreshDeps: [apiParams],
  });

  const renderBranchExpansion = (branch: ExternalBillingBranch) => {
    const data = loadsByBranch.get(branch.branchId);
    return (
      <UserTable
        userGroups={data?.userGroups ?? []}
        loading={expandingBranchId === branch.branchId}
      />
    );
  };

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
        columns={branchColumns}
        rowKey="branchId"
        pagination={false}
        expandable={{
          expandedRowRender: renderBranchExpansion,
          onExpand: (expanded, record) => onExpand(expanded, record.branchId),
        }}
      />
    </>
  );
}
