import { PlusOutlined } from "@ant-design/icons";
import { useAntdTable } from "ahooks";
import { Button, Flex, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
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
  const [createOpen, setCreateOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();
  const [activeQuery, setActiveQuery] = useState("");

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
        scroll={{ x: 1000 }}
        size="middle"
      />

      <CreateOfficeExpenseModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={refresh}
      />
    </>
  );
}
