import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { useAntdTable, useRequest } from "ahooks";
import { App, Button, Card, Drawer, Empty, Flex, Input, Table, Typography } from "antd";
import type React from "react";
import { useState } from "react";
import type { AdvancedFilter, FilterField } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { canEditBrokerRequests, canViewBrokerRequests } from "@/utils/permissions";
import {
  approveBrokerRequest,
  listBrokerRequests,
  rejectBrokerRequest,
} from "../api/brokerRequestApi";
import {
  BrokerRequestDetails,
  BrokerRequestReviewSummary,
} from "../components/BrokerRequestDetails";
import { useBrokerRequestColumns } from "../components/useBrokerRequestColumns";
import { useBrokerRequestDrawer } from "../hooks/useBrokerRequestDrawer";

const { Title } = Typography;

const BOOL_OPTIONS = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

const FILTER_FIELDS: FilterField[] = [
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
  { key: "creditLimitUnlimited", label: "Credit unlimited", type: "select", options: BOOL_OPTIONS },
  { key: "creditLimit", label: "Credit limit", type: "numberRange" },
];

const BrokerRequestsTab: React.FC = () => {
  const { message } = App.useApp();
  const { permissions } = useCurrentUser();
  const canView = canViewBrokerRequests(permissions);
  const canReview = canEditBrokerRequests(permissions);

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
  } = useBrokerRequestDrawer();

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await listBrokerRequests({
        page: current - 1,
        limit: pageSize,
        sortField: (s?.field ?? "createdAt") as "createdAt" | "brokerName" | "mcNumber" | "status",
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
        query: activeQuery || undefined,
        filters: activeFilter ? JSON.stringify(activeFilter) : undefined,
      });
      return { total: result.total, list: result.requests };
    },
    { refreshDeps: [activeQuery, activeFilter], defaultPageSize: 10 },
  );

  const columns = useBrokerRequestColumns(openView, canView);

  const handleFilterApply = (filter: AdvancedFilter | undefined, query: string | undefined) => {
    setActiveFilter(filter);
    setActiveQuery(query ?? "");
  };

  const { loading: approving, run: approve } = useRequest(
    (id: string) => approveBrokerRequest(id),
    {
      manual: true,
      onSuccess: () => {
        message.success("Request approved; broker is now active");
        closeDrawer();
        refresh();
      },
      onError: (e) => message.error(getErrorMessage(e)),
    },
  );

  const { loading: rejecting, run: reject } = useRequest(
    (id: string, reason?: string) => rejectBrokerRequest(id, { rejectionReason: reason }),
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

  const renderDrawerFooter = () => {
    if (!record || record.status !== "pending" || !canReview) return null;
    if (showRejectInput) {
      return (
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
      );
    }
    return (
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
    );
  };

  const drawerTitle = record ? `${record.brokerName} — ${record.mcNumber}` : "Broker request";

  return (
    <div>
      <Card>
        <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Broker requests ({tableProps.pagination?.total ?? 0})
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

        <Table
          rowKey="id"
          columns={columns}
          scroll={{ x: "max-content" }}
          {...tableProps}
          locale={{ emptyText: <Empty description="No broker requests yet" /> }}
        />
      </Card>

      <Drawer
        title={drawerTitle}
        open={open}
        onClose={closeDrawer}
        size="large"
        footer={renderDrawerFooter()}
      >
        {record && (
          <Flex vertical gap="large">
            <BrokerRequestDetails record={record} />
            <BrokerRequestReviewSummary record={record} />
          </Flex>
        )}
      </Drawer>
    </div>
  );
};

export default BrokerRequestsTab;
