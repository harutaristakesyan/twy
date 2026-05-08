import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  FilterOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useAntdTable, useDebounce } from "ahooks";
import {
  Badge,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Flex,
  Input,
  message,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type React from "react";
import { useState } from "react";
import type { AdvancedFilter, FieldConfig } from "@/components/AdvancedFilter";
import { AdvancedFilterDrawer } from "@/components/AdvancedFilter";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { canEditBrokerRequests, canViewBrokerRequests } from "@/utils/permissions";
import {
  approveBrokerRequest,
  listBrokerRequests,
  rejectBrokerRequest,
} from "../api/brokerRequestApi";
import type { BrokerRequest, BrokerRequestStatusFilter } from "../types/brokerRequest";

const { Title, Text } = Typography;
const { Search } = Input;

const BOOL_OPTIONS = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

const BROKER_REQ_FILTER_FIELDS: FieldConfig[] = [
  { key: "brokerName", label: "Broker name", type: "text" },
  { key: "mcNumber", label: "MC #", type: "text" },
  { key: "contactName", label: "Contact name", type: "text" },
  { key: "phone", label: "Phone", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "address", label: "Address", type: "text" },
  { key: "notes", label: "Notes", type: "text" },
  {
    key: "status",
    label: "Request status",
    type: "enum",
    options: [
      { label: "Pending", value: "pending" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
    ],
  },
  {
    key: "creditLimitUnlimited",
    label: "Credit unlimited",
    type: "enum",
    options: BOOL_OPTIONS,
  },
  { key: "creditLimit", label: "Credit limit", type: "number" },
  { key: "rejectionReason", label: "Rejection reason", type: "text" },
];

const statusColors: Record<string, string> = {
  pending: "processing",
  approved: "success",
  rejected: "error",
};

const BrokerRequestsTab: React.FC = () => {
  const { permissions } = useCurrentUser();
  const canView = canViewBrokerRequests(permissions);
  const canReview = canEditBrokerRequests(permissions);

  const [statusFilter, setStatusFilter] = useState<BrokerRequestStatusFilter>("pending");
  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebounce(searchInput, { wait: 400 });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();

  const isAdvFilterActive = (activeFilter?.rules?.length ?? 0) > 0;

  const activeRuleCount = activeFilter?.rules?.length ?? 0;

  const [viewRecord, setViewRecord] = useState<BrokerRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await listBrokerRequests({
        page: current - 1,
        limit: pageSize,
        sortField: (s?.field ?? "createdAt") as "createdAt" | "brokerName" | "mcNumber" | "status",
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
        status: statusFilter,
        query: isAdvFilterActive ? undefined : searchText || undefined,
        filters: isAdvFilterActive ? JSON.stringify(activeFilter) : undefined,
      });
      return { total: result.total, list: result.requests };
    },
    { refreshDeps: [statusFilter, searchText, activeFilter], defaultPageSize: 10 },
  );

  const handleFilterApply = (filter: AdvancedFilter) => {
    setActiveFilter(filter.rules.length > 0 ? filter : undefined);
    setFilterDrawerOpen(false);
  };

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const openView = (record: BrokerRequest) => {
    setViewRecord(record);
    setShowRejectInput(false);
    setRejectReason("");
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setViewRecord(null);
    setShowRejectInput(false);
    setRejectReason("");
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await approveBrokerRequest(id);
      message.success("Request approved; broker is now active");
      closeDrawer();
      refresh();
    } catch (e) {
      message.error(getErrorMessage(e));
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!viewRecord) return;
    setRejecting(true);
    try {
      await rejectBrokerRequest(viewRecord.id, { rejectionReason: rejectReason || undefined });
      message.success("Request rejected");
      closeDrawer();
      refresh();
    } catch (e) {
      message.error(getErrorMessage(e));
    } finally {
      setRejecting(false);
    }
  };

  const columns: ColumnsType<BrokerRequest> = [
    {
      title: "Broker name",
      dataIndex: "brokerName",
      key: "brokerName",
      sorter: true,
    },
    {
      title: "MC number",
      dataIndex: "mcNumber",
      key: "mcNumber",
      render: (v: string) => <Text code>{v}</Text>,
      sorter: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (st: string) => <Tag color={statusColors[st] ?? "default"}>{st}</Tag>,
      sorter: true,
    },
    {
      title: "Submitted",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (d: string) => (d ? new Date(d).toLocaleDateString() : "—"),
      sorter: true,
    },
    {
      title: "Reviewed by",
      key: "reviewedBy",
      width: 140,
      render: (_, r) =>
        r.reviewedByName ? <Text>{r.reviewedByName}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 90,
      fixed: "right",
      render: (_, record) =>
        canView ? (
          <Button size="small" icon={<EyeOutlined />} onClick={() => openView(record)}>
            View
          </Button>
        ) : null,
    },
  ];

  const drawerTitle = viewRecord
    ? `${viewRecord.brokerName} — ${viewRecord.mcNumber}`
    : "Broker request";

  return (
    <div>
      <Card>
        <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Broker requests ({tableProps.pagination?.total ?? 0})
          </Title>
          <Flex align="middle" gap="middle" wrap>
            <Select<BrokerRequestStatusFilter>
              style={{ width: 160 }}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              options={[
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
                { value: "all", label: "All" },
              ]}
            />
            <Tooltip
              title={isAdvFilterActive ? "Clear advanced filters to use simple search" : undefined}
            >
              <Search
                placeholder="Search by name or MC number…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
                disabled={isAdvFilterActive}
                style={{ width: 260, opacity: isAdvFilterActive ? 0.5 : 1 }}
              />
            </Tooltip>
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

        <Table<BrokerRequest>
          rowKey="id"
          columns={columns}
          scroll={{ x: 900 }}
          {...tableProps}
          locale={{
            emptyText: (
              <Empty
                description={
                  searchText && !isAdvFilterActive
                    ? `No requests match "${searchText}"`
                    : "No broker requests yet"
                }
              />
            ),
          }}
        />
      </Card>

      <Drawer
        title={drawerTitle}
        open={drawerOpen}
        onClose={closeDrawer}
        size="large"
        footer={
          viewRecord?.status === "pending" && canReview ? (
            showRejectInput ? (
              <Flex vertical gap="small">
                <Input.TextArea
                  rows={3}
                  placeholder="Rejection reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  autoFocus
                />
                <Flex gap="small" justify="flex-end">
                  <Button onClick={() => setShowRejectInput(false)}>Cancel</Button>
                  <Button danger loading={rejecting} onClick={() => void handleRejectConfirm()}>
                    Confirm reject
                  </Button>
                </Flex>
              </Flex>
            ) : (
              <Flex gap="small" justify="flex-end">
                <Button danger icon={<CloseOutlined />} onClick={() => setShowRejectInput(true)}>
                  Reject
                </Button>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={approvingId === viewRecord.id}
                  onClick={() => void handleApprove(viewRecord.id)}
                >
                  Approve
                </Button>
              </Flex>
            )
          ) : null
        }
      >
        {viewRecord && (
          <Flex vertical gap="large">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Broker name">{viewRecord.brokerName}</Descriptions.Item>
              <Descriptions.Item label="MC number">
                <Text code>{viewRecord.mcNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Contact name">
                {viewRecord.contactName ?? <Text type="secondary">—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {viewRecord.phone ?? <Text type="secondary">—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {viewRecord.email ?? <Text type="secondary">—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Address">
                {viewRecord.address ?? <Text type="secondary">—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Credit limit">
                {viewRecord.creditLimitUnlimited ? (
                  <Tag color="blue">Unlimited</Tag>
                ) : viewRecord.creditLimit !== null ? (
                  new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(
                    viewRecord.creditLimit,
                  )
                ) : (
                  <Text type="secondary">—</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Notes">
                {viewRecord.notes ?? <Text type="secondary">—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColors[viewRecord.status] ?? "default"}>{viewRecord.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Submitted">
                {new Date(viewRecord.createdAt).toLocaleString()}
                {viewRecord.submittedByName && (
                  <Text type="secondary"> by {viewRecord.submittedByName}</Text>
                )}
              </Descriptions.Item>
            </Descriptions>

            {(viewRecord.status === "approved" || viewRecord.status === "rejected") &&
              viewRecord.reviewedAt && (
                <Card size="small">
                  <Flex vertical gap={4}>
                    <Text strong>
                      {viewRecord.status === "approved" ? "Approved" : "Rejected"}
                      {viewRecord.reviewedByName && <Text> by {viewRecord.reviewedByName}</Text>}
                    </Text>
                    <Text type="secondary">{new Date(viewRecord.reviewedAt).toLocaleString()}</Text>
                    {viewRecord.status === "rejected" && viewRecord.rejectionReason && (
                      <Space direction="vertical" size={4} style={{ marginTop: 8 }}>
                        <Text type="secondary">Reason:</Text>
                        <Text>{viewRecord.rejectionReason}</Text>
                      </Space>
                    )}
                  </Flex>
                </Card>
              )}
          </Flex>
        )}
      </Drawer>

      <AdvancedFilterDrawer
        open={filterDrawerOpen}
        title="Advanced Search — Broker Requests"
        fields={BROKER_REQ_FILTER_FIELDS}
        initialFilter={activeFilter}
        onApply={handleFilterApply}
        onClose={() => setFilterDrawerOpen(false)}
      />
    </div>
  );
};

export default BrokerRequestsTab;
