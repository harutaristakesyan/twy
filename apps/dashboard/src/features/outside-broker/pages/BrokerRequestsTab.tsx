import { CheckOutlined, CloseOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useAntdTable, useDebounce, useLatest, useUpdateEffect } from "ahooks";
import {
  Button,
  Card,
  Empty,
  Flex,
  Input,
  Modal,
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
import { canEditBrokerRequests } from "@/utils/permissions";
import {
  approveBrokerRequest,
  listBrokerRequests,
  rejectBrokerRequest,
} from "../api/brokerRequestApi";
import type { BrokerRequest, BrokerRequestStatusFilter } from "../types/brokerRequest";

const { Title, Text } = Typography;
const { Search } = Input;

const statusColors: Record<string, string> = {
  pending: "processing",
  approved: "success",
  rejected: "error",
};

const BrokerRequestsTab: React.FC = () => {
  const { permissions } = useCurrentUser();
  const canReview = canEditBrokerRequests(permissions);

  const [statusFilter, setStatusFilter] = useState<BrokerRequestStatusFilter>("pending");
  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebounce(searchInput, { wait: 400 });
  const searchTextRef = useLatest(searchText);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<BrokerRequest | null>(null);
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

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await approveBrokerRequest(id);
      message.success("Request approved; broker is now active");
      refresh();
    } catch (e) {
      message.error(getErrorMessage(e));
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      await rejectBrokerRequest(rejectTarget.id, { rejectionReason: rejectReason || undefined });
      message.success("Request rejected");
      setRejectOpen(false);
      setRejectTarget(null);
      setRejectReason("");
      refresh();
    } catch (e) {
      message.error(getErrorMessage(e));
    } finally {
      setRejecting(false);
    }
  };

  const openReject = (record: BrokerRequest) => {
    setRejectTarget(record);
    setRejectReason("");
    setRejectOpen(true);
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
      render: (d: string) => (d ? new Date(d).toLocaleString() : "—"),
      sorter: true,
    },
    {
      title: "Reviewed",
      key: "reviewed",
      width: 120,
      render: (_, r) =>
        r.reviewedAt ? (
          <span>{new Date(r.reviewedAt).toLocaleString()}</span>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      fixed: "right",
      render: (_, record) =>
        record.status === "pending" && canReview ? (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              loading={approvingId === record.id}
              onClick={() => void handleApprove(record.id)}
            >
              Approve
            </Button>
            <Button danger size="small" icon={<CloseOutlined />} onClick={() => openReject(record)}>
              Reject
            </Button>
          </Space>
        ) : record.status === "rejected" && record.rejectionReason ? (
          <Text type="secondary" ellipsis={{ tooltip: record.rejectionReason }}>
            {record.rejectionReason}
          </Text>
        ) : null,
    },
  ];

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
            <Search
              placeholder="Search by name or MC number…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 260 }}
            />
            <Button icon={<ReloadOutlined />} onClick={refresh} loading={tableProps.loading}>
              Refresh
            </Button>
          </Flex>
        </Flex>

        <Table<BrokerRequest>
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
                  searchText ? `No requests match “${searchText}”` : "No broker requests yet"
                }
              />
            ),
          }}
        />
      </Card>

      <Modal
        title="Reject broker request"
        open={rejectOpen}
        onCancel={() => {
          setRejectOpen(false);
          setRejectTarget(null);
        }}
        okText="Reject"
        okButtonProps={{ danger: true, loading: rejecting }}
        onOk={() => void handleRejectConfirm()}
      >
        <p>
          Reject request for <Text strong>{rejectTarget?.brokerName}</Text> (
          {rejectTarget?.mcNumber})?
        </p>
        <Input.TextArea
          rows={3}
          placeholder="Optional reason (shown to admins only)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default BrokerRequestsTab;
