import { CheckOutlined, CloseOutlined, SearchOutlined } from "@ant-design/icons";
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
import {
  approveCarrierRequest,
  listCarrierRequests,
  rejectCarrierRequest,
} from "../api/carrierRequestApi";
import type { CarrierRequest, CarrierRequestStatusFilter } from "../types/carrierRequest";

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

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<CarrierRequest | null>(null);
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

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await approveCarrierRequest(id);
      message.success("Request approved; carrier is now active");
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
      await rejectCarrierRequest(rejectTarget.id, { rejectionReason: rejectReason || undefined });
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

  const openReject = (record: CarrierRequest) => {
    setRejectTarget(record);
    setRejectReason("");
    setRejectOpen(true);
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
                  searchText ? `No requests match “${searchText}”` : "No carrier requests yet"
                }
              />
            ),
          }}
        />
      </Card>

      <Modal
        title="Reject carrier request"
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
          Reject request for <Text strong>{rejectTarget?.carrierName}</Text> (
          {rejectTarget?.mcDotNumber})?
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

export default CarrierRequestsTab;
