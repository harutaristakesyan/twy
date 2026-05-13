import { PlusOutlined } from "@ant-design/icons";
import { useAntdTable } from "ahooks";
import { Button, Flex, Space, Table, Typography } from "antd";
import { useCallback, useState } from "react";
import type { AdvancedFilter, FilterField } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { usePermission } from "@/hooks/usePermission";
import { officeExpenseApi } from "../api/officeExpensePaymentOrderApi";
import {
  OFFICE_EXPENSE_SERVICE_OPTIONS,
  OFFICE_EXPENSE_STATUS_OPTIONS,
  type OfficeExpensePaymentOrder,
} from "../types/officeExpensePaymentOrder";
import CreateOfficeExpenseModal from "./CreateOfficeExpenseModal";
import OfficeExpensePaymentOrderDetailModal from "./OfficeExpensePaymentOrderDetailModal";
import { useOfficeExpenseColumns } from "./useOfficeExpenseColumns";

const { Title } = Typography;

const fields: FilterField[] = [
  {
    key: "serviceName",
    label: "Service",
    type: "select",
    options: OFFICE_EXPENSE_SERVICE_OPTIONS,
    placeholder: "All services",
  },
  {
    key: "paymentStatus",
    label: "Status",
    type: "select",
    options: OFFICE_EXPENSE_STATUS_OPTIONS,
    placeholder: "All statuses",
  },
];

export default function OfficeExpensePOTab() {
  const canCreate = usePermission("office_expense_payment_order", "add");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<OfficeExpensePaymentOrder | null>(null);
  const [detailMode, setDetailMode] = useState<"view" | "edit">("view");
  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();
  const [activeQuery, setActiveQuery] = useState("");

  const openDetail = useCallback((record: OfficeExpensePaymentOrder, mode: "view" | "edit") => {
    setDetailOrder(record);
    setDetailMode(mode);
    setDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailOrder(null);
  }, []);

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize }) => {
      const res = await officeExpenseApi.list({
        page: (current ?? 1) - 1,
        limit: pageSize ?? 20,
        query: activeQuery || undefined,
        filters: activeFilter ? JSON.stringify(activeFilter) : undefined,
      });
      return { list: res.orders, total: res.total };
    },
    { refreshDeps: [activeQuery, activeFilter], defaultPageSize: 20 },
  );

  const columns = useOfficeExpenseColumns(openDetail);

  const handleFilterApply = (filter: AdvancedFilter | undefined, query: string | undefined) => {
    setActiveFilter(filter);
    setActiveQuery(query ?? "");
  };

  return (
    <>
      <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Office Expense Payment Orders (
          {typeof tableProps.pagination === "object" ? (tableProps.pagination?.total ?? 0) : 0})
        </Title>
        <Space wrap>
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              Create
            </Button>
          )}
          <AdvancedFilterPopover
            fields={fields}
            initialFilter={activeFilter}
            initialQuery={activeQuery}
            onApply={handleFilterApply}
          />
        </Space>
      </Flex>

      <ActiveFilterChips
        filter={activeFilter}
        fields={fields}
        query={activeQuery}
        onChange={setActiveFilter}
        onClearQuery={() => setActiveQuery("")}
      />

      <Table<OfficeExpensePaymentOrder>
        {...tableProps}
        columns={columns}
        rowKey="id"
        scroll={{ x: "max-content" }}
        size="middle"
      />

      <CreateOfficeExpenseModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={refresh}
      />

      <OfficeExpensePaymentOrderDetailModal
        order={detailOrder}
        open={detailOpen}
        mode={detailMode}
        onClose={closeDetail}
        onSuccess={refresh}
      />
    </>
  );
}
