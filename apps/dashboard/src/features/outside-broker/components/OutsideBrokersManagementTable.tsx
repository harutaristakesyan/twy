import { PlusOutlined } from "@ant-design/icons";
import { useAntdTable, useRequest } from "ahooks";
import { Button, Card, Empty, Flex, message, Table, Typography } from "antd";
import type React from "react";
import { useCallback, useState } from "react";
import type { AdvancedFilter, FilterField } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteOutsideBroker, getOutsideBrokers } from "../api/brokerApi";
import { useOutsideBrokerModal } from "../providers/OutsideBrokerModalProvider";
import { BrokerStatus } from "../types/broker";
import { useOutsideBrokerColumns } from "./useOutsideBrokerColumns";

const { Title } = Typography;

type SortField = "brokerName" | "mcNumber" | "createdAt" | undefined;

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
      { label: "Approved", value: BrokerStatus.APPROVED },
      { label: "Pending", value: BrokerStatus.PENDING },
      { label: "Denied", value: BrokerStatus.DENIED },
    ],
  },
  { key: "creditLimitUnlimited", label: "Credit unlimited", type: "select", options: BOOL_OPTIONS },
  { key: "creditLimit", label: "Credit limit", type: "numberRange" },
];

const OutsideBrokersManagementTable: React.FC = () => {
  const { permissions } = useCurrentUser();
  const { openOutsideBrokerCreate } = useOutsideBrokerModal();
  const canCreate = permissions.brokers.add;

  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();
  const [activeQuery, setActiveQuery] = useState("");

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await getOutsideBrokers({
        page: current - 1,
        limit: pageSize,
        sortField: s?.field as SortField,
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
        query: activeQuery || undefined,
        filters: activeFilter ? JSON.stringify(activeFilter) : undefined,
      });
      return { total: result.total, list: result.brokers };
    },
    { refreshDeps: [activeQuery, activeFilter], defaultPageSize: 10 },
  );

  const { run: runDelete } = useRequest(deleteOutsideBroker, {
    manual: true,
    onSuccess: () => {
      message.success("Outside broker deleted successfully");
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const handleFilterApply = useCallback(
    (filter: AdvancedFilter | undefined, query: string | undefined) => {
      setActiveFilter(filter);
      setActiveQuery(query ?? "");
    },
    [],
  );

  const columns = useOutsideBrokerColumns(refresh, runDelete);

  return (
    <div>
      <Card>
        <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Outside Brokers ({tableProps.pagination.total ?? 0})
          </Title>
          <Flex align="middle" gap="middle">
            <AdvancedFilterPopover
              fields={FILTER_FIELDS}
              initialFilter={activeFilter}
              initialQuery={activeQuery}
              onApply={handleFilterApply}
            />
            {canCreate && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openOutsideBrokerCreate()}
              >
                Add Broker
              </Button>
            )}
          </Flex>
        </Flex>

        <ActiveFilterChips
          filter={activeFilter}
          fields={FILTER_FIELDS}
          query={activeQuery}
          onChange={setActiveFilter}
          onClearQuery={() => setActiveQuery("")}
        />

        <Table
          columns={columns}
          rowKey="id"
          scroll={{ x: 1200 }}
          {...tableProps}
          locale={{ emptyText: <Empty description="No outside brokers found" /> }}
        />
      </Card>
    </div>
  );
};

export default OutsideBrokersManagementTable;
