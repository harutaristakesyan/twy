import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { useAntdTable, useRequest } from "ahooks";
import { Button, Card, Drawer, Empty, Flex, Input, message, Table, Typography } from "antd";
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
import {
  CarrierRequestDetails,
  CarrierRequestReviewSummary,
} from "../components/CarrierRequestDetails";
import { useCarrierRequestColumns } from "../components/useCarrierRequestColumns";
import { useCarrierRequestDrawer } from "../hooks/useCarrierRequestDrawer";
import { InsuranceStatus } from "../types/carrier";

const { Title } = Typography;

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

  const columns = useCarrierRequestColumns(openView);

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

        <Table
          rowKey="id"
          columns={columns}
          scroll={{ x: "max-content" }}
          {...tableProps}
          locale={{ emptyText: <Empty description="No carrier requests yet" /> }}
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
            <CarrierRequestDetails record={record} />
            <CarrierRequestReviewSummary record={record} />
          </Flex>
        )}
      </Drawer>
    </div>
  );
};

export default CarrierRequestsTab;
