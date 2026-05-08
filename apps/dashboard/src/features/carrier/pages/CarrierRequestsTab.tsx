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
import {
  approveCarrierRequest,
  listCarrierRequests,
  rejectCarrierRequest,
} from "../api/carrierRequestApi";
import { InsuranceStatus } from "../types/carrier";
import type { CarrierRequest, CarrierRequestStatusFilter } from "../types/carrierRequest";
import { deriveInsuranceStatus } from "../utils/insuranceStatus";

const { Title, Text } = Typography;
const { Search } = Input;

const CARRIER_REQ_FILTER_FIELDS: FieldConfig[] = [
  {
    key: "kind",
    label: "Kind",
    type: "enum",
    options: [
      { label: "Twy", value: "twy" },
      { label: "Outside", value: "outside" },
    ],
  },
  { key: "carrierName", label: "Carrier name", type: "text" },
  { key: "mcDotNumber", label: "MC/DOT #", type: "text" },
  { key: "equipmentType", label: "Equipment type", type: "text" },
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
    key: "insuranceStatus",
    label: "Insurance status",
    type: "enum",
    options: [
      { label: "Valid", value: InsuranceStatus.VALID },
      { label: "Expired", value: InsuranceStatus.EXPIRED },
      { label: "Pending", value: InsuranceStatus.PENDING },
    ],
  },
  { key: "phone", label: "Phone", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "notes", label: "Notes", type: "text" },
  { key: "rejectionReason", label: "Rejection reason", type: "text" },
];

const statusColors: Record<string, string> = {
  pending: "processing",
  approved: "success",
  rejected: "error",
};

const CarrierRequestsTab: React.FC = () => {
  const { permissions } = useCurrentUser();
  const canReview = permissions.carriers_requests?.edit;

  const [statusFilter, setStatusFilter] = useState<CarrierRequestStatusFilter>("pending");
  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebounce(searchInput, { wait: 400 });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();

  const isAdvFilterActive = (activeFilter?.rules?.length ?? 0) > 0;

  const activeRuleCount = activeFilter?.rules?.length ?? 0;

  const [viewRecord, setViewRecord] = useState<CarrierRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await listCarrierRequests({
        page: current - 1,
        limit: pageSize,
        sortField: (s?.field ?? "createdAt") as
          | "createdAt"
          | "carrierName"
          | "mcDotNumber"
          | "status",
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

  const openView = (record: CarrierRequest) => {
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
      await approveCarrierRequest(id);
      message.success("Request approved; carrier is now active");
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
      await rejectCarrierRequest(viewRecord.id, { rejectionReason: rejectReason || undefined });
      message.success("Request rejected");
      closeDrawer();
      refresh();
    } catch (e) {
      message.error(getErrorMessage(e));
    } finally {
      setRejecting(false);
    }
  };

  const columns: ColumnsType<CarrierRequest> = [
    {
      title: "Kind",
      dataIndex: "kind",
      key: "kind",
      width: 90,
      render: (k: string) => <Tag>{k === "twy" ? "Twy" : "Outside"}</Tag>,
    },
    {
      title: "Carrier name",
      dataIndex: "carrierName",
      key: "carrierName",
      sorter: true,
    },
    {
      title: "MC / DOT",
      dataIndex: "mcDotNumber",
      key: "mcDotNumber",
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
      render: (_, record) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => openView(record)}>
          View
        </Button>
      ),
    },
  ];

  const drawerTitle = viewRecord
    ? `${viewRecord.carrierName} — ${viewRecord.mcDotNumber}`
    : "Carrier request";

  return (
    <div>
      <Card>
        <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Carrier requests ({tableProps.pagination?.total ?? 0})
          </Title>
          <Flex align="middle" gap="middle" wrap>
            <Select<CarrierRequestStatusFilter>
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
                placeholder="Search by name or MC/DOT…"
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

        <Table<CarrierRequest>
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
                    : "No carrier requests yet"
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
              <Descriptions.Item label="Kind">
                <Tag>{viewRecord.kind === "twy" ? "Twy" : "Outside"}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Carrier name">{viewRecord.carrierName}</Descriptions.Item>
              <Descriptions.Item label="MC / DOT">
                <Text code>{viewRecord.mcDotNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Equipment type">
                {viewRecord.equipmentType ?? <Text type="secondary">—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Insurance status">
                {viewRecord.insuranceExpiry ? (
                  <Tag color={deriveInsuranceStatus(viewRecord.insuranceExpiry).color}>
                    {deriveInsuranceStatus(viewRecord.insuranceExpiry).label}
                  </Tag>
                ) : (
                  <Text type="secondary">—</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Insurance expiry">
                {viewRecord.insuranceExpiry ? (
                  new Date(viewRecord.insuranceExpiry).toLocaleDateString()
                ) : (
                  <Text type="secondary">—</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {viewRecord.phone ?? <Text type="secondary">—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {viewRecord.email ?? <Text type="secondary">—</Text>}
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
        title="Advanced Search — Carrier Requests"
        fields={CARRIER_REQ_FILTER_FIELDS}
        initialFilter={activeFilter}
        onApply={handleFilterApply}
        onClose={() => setFilterDrawerOpen(false)}
      />
    </div>
  );
};

export default CarrierRequestsTab;
