import { FilterOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useAntdTable, useDebounce, useRequest } from "ahooks";
import {
  Badge,
  Button,
  Card,
  Empty,
  Flex,
  Input,
  message,
  Space,
  Table,
  Tooltip,
  Typography,
} from "antd";
import type React from "react";
import { useState } from "react";
import type { AdvancedFilter, FieldConfig } from "@/components/AdvancedFilter";
import { AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteOutsideBroker, getOutsideBrokers } from "../api/brokerApi";
import { useOutsideBrokerModal } from "../providers/OutsideBrokerModalProvider";
import { BrokerStatus } from "../types/broker";
import { useOutsideBrokerColumns } from "./useOutsideBrokerColumns";

const { Title, Text } = Typography;
const { Search } = Input;

type SortField = "brokerName" | "mcNumber" | "createdAt" | undefined;

const BOOL_OPTIONS = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

const OUTSIDE_BROKER_FILTER_FIELDS: FieldConfig[] = [
  { key: "brokerName", label: "Broker name", type: "text" },
  { key: "mcNumber", label: "MC #", type: "text" },
  { key: "contactName", label: "Contact name", type: "text" },
  { key: "phone", label: "Phone", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "address", label: "Address", type: "text" },
  { key: "notes", label: "Notes", type: "text" },
  {
    key: "status",
    label: "Status",
    type: "enum",
    options: [
      { label: "Approved", value: BrokerStatus.APPROVED },
      { label: "Pending", value: BrokerStatus.PENDING },
      { label: "Denied", value: BrokerStatus.DENIED },
    ],
  },
  {
    key: "creditLimitUnlimited",
    label: "Credit unlimited",
    type: "enum",
    options: BOOL_OPTIONS,
  },
  { key: "creditLimit", label: "Credit limit", type: "number" },
];

const OutsideBrokersManagementTable: React.FC = () => {
  const { permissions } = useCurrentUser();
  const { openOutsideBrokerCreate } = useOutsideBrokerModal();
  const canCreate = permissions.brokers.add;

  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebounce(searchInput, { wait: 500 });
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();

  const isFilterActive = (activeFilter?.rules?.length ?? 0) > 0;

  const activeRuleCount = activeFilter?.rules?.length ?? 0;

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await getOutsideBrokers({
        page: current - 1,
        limit: pageSize,
        sortField: s?.field as SortField,
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
        query: isFilterActive ? undefined : searchText || undefined,
        filters: isFilterActive ? JSON.stringify(activeFilter) : undefined,
      });
      return { total: result.total, list: result.brokers };
    },
    { refreshDeps: [searchText, activeFilter], defaultPageSize: 10 },
  );

  const { run: runDelete } = useRequest(deleteOutsideBroker, {
    manual: true,
    onSuccess: () => {
      message.success("Outside broker deleted successfully");
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const handleFilterApply = (filter: AdvancedFilter | undefined) => {
    setActiveFilter(filter && filter.rules.length > 0 ? filter : undefined);
  };

  const columns = useOutsideBrokerColumns(refresh, runDelete);

  return (
    <div>
      <Card>
        <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Outside Brokers ({tableProps.pagination.total ?? 0})
          </Title>
          <Flex align="middle" gap="middle">
            <Tooltip
              title={isFilterActive ? "Clear advanced filters to use simple search" : undefined}
            >
              <Search
                placeholder="Search brokers..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
                disabled={isFilterActive}
                style={{ opacity: isFilterActive ? 0.5 : 1 }}
              />
            </Tooltip>
            <Badge count={isFilterActive ? activeRuleCount : 0} size="small">
              <Space.Compact>
                <AdvancedFilterPopover
                  open={popoverOpen}
                  title="Advanced Search — Outside Brokers"
                  quickFields={[]}
                  ruleFields={OUTSIDE_BROKER_FILTER_FIELDS}
                  initialFilter={activeFilter}
                  onApply={handleFilterApply}
                  onClose={() => setPopoverOpen(false)}
                >
                  <Button
                    icon={<FilterOutlined />}
                    type={isFilterActive ? "primary" : "default"}
                    onClick={() => setPopoverOpen(true)}
                  >
                    Advanced Search
                  </Button>
                </AdvancedFilterPopover>
                {isFilterActive && (
                  <Button
                    type="primary"
                    onClick={() => setActiveFilter(undefined)}
                    title="Clear filters"
                  >
                    ×
                  </Button>
                )}
              </Space.Compact>
            </Badge>
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

        <Table
          columns={columns}
          rowKey="id"
          scroll={{ x: 1200 }}
          {...tableProps}
          locale={{
            emptyText:
              searchText && !isFilterActive ? (
                <Empty
                  description={
                    <span>
                      No brokers found matching <Text strong>"{searchText}"</Text>
                    </span>
                  }
                />
              ) : (
                <Empty description="No outside brokers found" />
              ),
          }}
        />
      </Card>
    </div>
  );
};

export default OutsideBrokersManagementTable;
