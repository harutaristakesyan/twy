import { CheckOutlined, CloseOutlined, EyeOutlined } from "@ant-design/icons";
import { useAntdTable, useRequest } from "ahooks";
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Flex,
  Input,
  message,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type React from "react";
import { useState } from "react";
import type { AdvancedFilter, FilterField } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import {
  approveCarrierRequest,
  listCarrierRequests,
  rejectCarrierRequest,
} from "../api/carrierRequestApi";
import { useCarrierRequestDrawer } from "../hooks/useCarrierRequestDrawer";
import { InsuranceStatus } from "../types/carrier";
import type { CarrierRequest } from "../types/carrierRequest";
import { deriveInsuranceStatus } from "../utils/insuranceStatus";

const { Title, Text } = Typography;

const FILTER_FIELDS: FilterField[] = [
  {
    key: "kind",
    label: "Kind",
    type: "select",
    options: [
      { label: "Twy", value: "twy" },
      { label: "Outside", value: "outside" },
    ],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Pending", value: "pending" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
    ],
  },
  {
    key: "insuranceStatus",
    label: "Insurance status",
    type: "select",
    options: [
      { label: "Valid", value: InsuranceStatus.VALID },
      { label: "Expired", value: InsuranceStatus.EXPIRED },
      { label: "Pending", value: InsuranceStatus.PENDING },
    ],
  },
];

const statusColors: Record<string, string> = {
  pending: "processing",
  approved: "success",
  rejected: "error",
};

const CarrierRequestsTab: React.FC = () => {
  const { permissions } = useCurrentUser();
  const canReview = permissions.carriers_requests?.edit;

  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();
  const [activeQuery, setActiveQuery] = useState("");

  const {
    record,
    open,
    showRejectInput,
    rejectReason,
    openView,
    closeDrawer,
    setShowRejectInput,
    setRejectReason,
  } = useCarrierRequestDrawer();

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
        query: activeQuery || undefined,
        filters: activeFilter ? JSON.stringify(activeFilter) : undefined,
      });
      return { total: result.total, list: result.requests };
    },
    { refreshDeps: [activeQuery, activeFilter], defaultPageSize: 10 },
  );

  const handleFilterApply = (filter: AdvancedFilter | undefined, query: string | undefined) => {
    setActiveFilter(filter);
    setActiveQuery(query ?? "");
  };

  const { loading: approving, run: approve } = useRequest(
    (id: string) => approveCarrierRequest(id),
    {
      manual: true,
      onSuccess: () => {
        message.success("Request approved; carrier is now active");
        closeDrawer();
        refresh();
      },
      onError: (e) => message.error(getErrorMessage(e)),
    },
  );

  const { loading: rejecting, run: reject } = useRequest(
    (id: string, reason?: string) => rejectCarrierRequest(id, { rejectionReason: reason }),
    {
      manual: true,
      onSuccess: () => {
        message.success("Request rejected");
        closeDrawer();
        refresh();
      },
      onError: (e) => message.error(getErrorMessage(e)),
    },
  );

  const columns: ColumnsType<CarrierRequest> = [
    {
      title: "Kind",
      dataIndex: "kind",
      key: "kind",
      width: 90,
      render: (k: string) => <Tag>{k === "twy" ? "Twy" : "Outside"}</Tag>,
    },
    { title: "Carrier name", dataIndex: "carrierName", key: "carrierName", sorter: true },
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
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => openView(r)}>
          View
        </Button>
      ),
    },
  ];

  const drawerTitle = record ? `${record.carrierName} — ${record.mcDotNumber}` : "Carrier request";

  return (
    <div>
      <Card>
        <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Carrier requests ({tableProps.pagination?.total ?? 0})
          </Title>
          <AdvancedFilterPopover
            fields={FILTER_FIELDS}
            initialFilter={activeFilter}
            initialQuery={activeQuery}
            onApply={handleFilterApply}
          />
        </Flex>

        <ActiveFilterChips
          filter={activeFilter}
          fields={FILTER_FIELDS}
          query={activeQuery}
          onChange={setActiveFilter}
          onClearQuery={() => setActiveQuery("")}
        />

        <Table<CarrierRequest>
          rowKey="id"
          columns={columns}
          scroll={{ x: 900 }}
          {...tableProps}
          locale={{ emptyText: <Empty description="No carrier requests yet" /> }}
        />
      </Card>

      <Drawer
        title={drawerTitle}
        open={open}
        onClose={closeDrawer}
        size="large"
        footer={
          record?.status === "pending" && canReview ? (
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
                  <Button
                    danger
                    loading={rejecting}
                    onClick={() => reject(record.id, rejectReason || undefined)}
                  >
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
                  loading={approving}
                  onClick={() => approve(record.id)}
                >
                  Approve
                </Button>
              </Flex>
            )
          ) : null
        }
      >
        {record && (
          <Flex vertical gap="large">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Kind">
                <Tag>{record.kind === "twy" ? "Twy" : "Outside"}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Carrier name">{record.carrierName}</Descriptions.Item>
              <Descriptions.Item label="MC / DOT">
                <Text code>{record.mcDotNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Equipment type">
                {record.equipmentType ?? <Text type="secondary">—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Insurance status">
                {record.insuranceExpiry ? (
                  (() => {
                    const { color, label } = deriveInsuranceStatus(record.insuranceExpiry);
                    return <Tag color={color}>{label}</Tag>;
                  })()
                ) : (
                  <Text type="secondary">—</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Insurance expiry">
                {record.insuranceExpiry ? (
                  new Date(record.insuranceExpiry).toLocaleDateString()
                ) : (
                  <Text type="secondary">—</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {record.phone ?? <Text type="secondary">—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {record.email ?? <Text type="secondary">—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Notes">
                {record.notes ?? <Text type="secondary">—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColors[record.status] ?? "default"}>{record.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Submitted">
                {new Date(record.createdAt).toLocaleString()}
                {record.submittedByName && (
                  <Text type="secondary"> by {record.submittedByName}</Text>
                )}
              </Descriptions.Item>
            </Descriptions>

            {(record.status === "approved" || record.status === "rejected") &&
              record.reviewedAt && (
                <Card size="small">
                  <Flex vertical gap={4}>
                    <Text strong>
                      {record.status === "approved" ? "Approved" : "Rejected"}
                      {record.reviewedByName && <Text> by {record.reviewedByName}</Text>}
                    </Text>
                    <Text type="secondary">{new Date(record.reviewedAt).toLocaleString()}</Text>
                    {record.status === "rejected" && record.rejectionReason && (
                      <Flex vertical gap={4} style={{ marginTop: 8 }}>
                        <Text type="secondary">Reason:</Text>
                        <Text>{record.rejectionReason}</Text>
                      </Flex>
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
