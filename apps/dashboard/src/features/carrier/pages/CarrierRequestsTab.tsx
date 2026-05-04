import { CheckOutlined, CloseOutlined, EyeOutlined, SearchOutlined } from "@ant-design/icons";
import { useAntdTable, useDebounce, useLatest, useUpdateEffect } from "ahooks";
import {
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
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type React from "react";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import {
  approveCarrierRequest,
  listCarrierRequests,
  rejectCarrierRequest,
} from "../api/carrierRequestApi";
import type { CarrierRequest, CarrierRequestStatusFilter } from "../types/carrierRequest";
import { deriveInsuranceStatus } from "../utils/insuranceStatus";

const { Title, Text } = Typography;
const { Search } = Input;

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
  const searchTextRef = useLatest(searchText);

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
        query: searchTextRef.current || undefined,
      });
      return { total: result.total, list: result.requests };
    },
    { refreshDeps: [statusFilter], defaultPageSize: 10 },
  );

  useUpdateEffect(() => {
    void refresh();
  }, [searchText]);

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
            <Search
              placeholder="Search by name or MC/DOT…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 260 }}
            />
          </Flex>
        </Flex>

        <Table<CarrierRequest>
          rowKey="id"
          columns={columns}
          scroll={{ x: 900 }}
          {...tableProps}
          pagination={{
            ...tableProps.pagination,
            showSizeChanger: true,
            showTotal: (t, range) => `${range[0]}-${range[1]} of ${t} requests`,
          }}
          locale={{
            emptyText: (
              <Empty
                description={
                  searchText ? `No requests match "${searchText}"` : "No carrier requests yet"
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
        width={520}
        footer={
          viewRecord?.status === "pending" && canReview ? (
            showRejectInput ? (
              <Flex vertical gap="small">
                <Input.TextArea
                  rows={3}
                  placeholder="Rejection reason (optional)"
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
    </div>
  );
};

export default CarrierRequestsTab;
