import { EditOutlined, EyeOutlined, PlusOutlined } from "@ant-design/icons";
import { useAntdTable } from "ahooks";
import { Button, Flex, Space, Table, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useState } from "react";
import type { AdvancedFilter, FilterField } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { usePermission } from "@/hooks/usePermission";
import { renderDate } from "@/utils/formatters";
import { officeExpenseApi } from "../api/officeExpensePaymentOrderApi";
import {
  OFFICE_EXPENSE_SERVICE_OPTIONS,
  OFFICE_EXPENSE_STATUS_OPTIONS,
  type OfficeExpensePaymentOrder,
  type OfficeExpensePaymentStatus,
  type OfficeExpenseService,
  SERVICE_LABELS,
} from "../types/officeExpensePaymentOrder";
import CreateOfficeExpenseModal from "./CreateOfficeExpenseModal";
import OfficeExpensePaymentOrderDetailModal from "./OfficeExpensePaymentOrderDetailModal";
import PaymentStatusTag from "./PaymentStatusTag";

const { Title } = Typography;

const CURRENCY_SYMBOL: Record<string, string> = { USD: "$", EUR: "€" };

const renderAmount = (amount: number, record: OfficeExpensePaymentOrder) =>
  `${CURRENCY_SYMBOL[record.currency] ?? ""}${amount.toFixed(2)}`;

const renderPeriod = (_: unknown, record: OfficeExpensePaymentOrder) =>
  record.periodStart === record.periodEnd
    ? renderDate(record.periodStart)
    : `${renderDate(record.periodStart)} – ${renderDate(record.periodEnd)}`;

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
  const canView = usePermission("office_expense_payment_order", "view");
  const canEdit = usePermission("office_expense_payment_order", "edit");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<"view" | "edit">("view");
  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();
  const [activeQuery, setActiveQuery] = useState("");

  const openDetail = useCallback((id: string, mode: "view" | "edit") => {
    setDetailOrderId(id);
    setDetailMode(mode);
    setDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailOrderId(null);
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

  const handleFilterApply = (filter: AdvancedFilter | undefined, query: string | undefined) => {
    setActiveFilter(filter);
    setActiveQuery(query ?? "");
  };

  const columns: ColumnsType<OfficeExpensePaymentOrder> = [
    {
      title: "Service",
      dataIndex: "serviceName",
      key: "serviceName",
      width: 180,
      render: (v: OfficeExpenseService) => SERVICE_LABELS[v],
    },
    {
      title: "Payment Purpose",
      dataIndex: "paymentPurpose",
      key: "paymentPurpose",
      ellipsis: true,
    },
    {
      title: "Period",
      key: "period",
      width: 200,
      render: renderPeriod,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 120,
      render: (v: number, record) => renderAmount(v, record),
    },
    {
      title: "Status",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      width: 130,
      render: (v: OfficeExpensePaymentStatus) => <PaymentStatusTag status={v} />,
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: renderDate,
    },
    ...(canView || canEdit
      ? ([
          {
            title: "Actions",
            key: "actions",
            fixed: "right" as const,
            width: 100,
            render: (_: unknown, record: OfficeExpensePaymentOrder) => (
              <Space>
                {canEdit && (
                  <Tooltip title="Edit">
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => openDetail(record.id, "edit")}
                    />
                  </Tooltip>
                )}
                {canView && (
                  <Tooltip title="View">
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={() => openDetail(record.id, "view")}
                    />
                  </Tooltip>
                )}
              </Space>
            ),
          },
        ] satisfies ColumnsType<OfficeExpensePaymentOrder>)
      : []),
  ];

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
        scroll={{ x: canView || canEdit ? 1100 : 1000 }}
        size="middle"
      />

      <CreateOfficeExpenseModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={refresh}
      />

      <OfficeExpensePaymentOrderDetailModal
        orderId={detailOrderId}
        open={detailOpen}
        mode={detailMode}
        onClose={closeDetail}
        onSuccess={refresh}
      />
    </>
  );
}
