import { PlusOutlined } from "@ant-design/icons";
import { useAntdTable, useRequest } from "ahooks";
import { Button, Flex, Space, Table, Typography } from "antd";
import { useState } from "react";
import type { AdvancedFilter, FilterField } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { getBranches } from "@/features/branch/api/branchApi";
import { usePermission } from "@/hooks/usePermission";
import { paymentOrderApi } from "../api/paymentOrderApi";
import { usePaymentOrderModal } from "../hooks/usePaymentOrderModal";
import type { PaymentOrder } from "../types/paymentOrder";
import CreateLoadPaymentOrderModal from "./CreateLoadPaymentOrderModal";
import UpdatePaymentStatusModal from "./UpdatePaymentStatusModal";
import { useLoadPaymentOrderColumns } from "./useLoadPaymentOrderColumns";

const { Title } = Typography;

export default function LoadPaymentOrdersTab() {
  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();
  const [activeQuery, setActiveQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const canCreate = usePermission("load_payment_order", "add");
  const { selectedOrder, open, mode, openModal, closeModal } = usePaymentOrderModal();

  const { data: branchesData } = useRequest(() => getBranches({ limit: 200 }), {
    cacheKey: "branches-for-filter",
  });

  const fields: FilterField[] = [
    {
      key: "branchId",
      label: "Branch",
      type: "select",
      options: branchesData?.branches.map((b) => ({ label: b.name, value: b.id })) ?? [],
      placeholder: "All branches",
    },
  ];

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize }) => {
      const res = await paymentOrderApi.list({
        page: (current ?? 1) - 1,
        limit: pageSize ?? 20,
        query: activeQuery || undefined,
        filters: activeFilter ? JSON.stringify(activeFilter) : undefined,
      });
      return { list: res.paymentOrders, total: res.total };
    },
    { refreshDeps: [activeQuery, activeFilter], defaultPageSize: 20 },
  );

  const columns = useLoadPaymentOrderColumns(openModal);

  const handleFilterApply = (filter: AdvancedFilter | undefined, query: string | undefined) => {
    setActiveFilter(filter);
    setActiveQuery(query ?? "");
  };

  return (
    <>
      <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Load Payment Orders (
          {tableProps.pagination ? ((tableProps.pagination as { total?: number }).total ?? 0) : 0})
        </Title>
        <Space>
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

      <Table<PaymentOrder>
        {...tableProps}
        columns={columns}
        rowKey="id"
        scroll={{ x: "max-content" }}
        size="middle"
      />

      <UpdatePaymentStatusModal
        paymentOrder={selectedOrder}
        open={open}
        mode={mode}
        onClose={closeModal}
        onSuccess={refresh}
      />

      <CreateLoadPaymentOrderModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={refresh}
      />
    </>
  );
}
