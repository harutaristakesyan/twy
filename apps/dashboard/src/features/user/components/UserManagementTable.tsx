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
import { deleteUser, getUsers } from "../api/userApi";
import { useUserModal } from "../providers/UserModalProvider";
import { useUserColumns } from "./useUserColumns";

const { Title, Text } = Typography;
const { Search } = Input;

const BOOL_OPTIONS = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

const USER_FILTER_FIELDS: FieldConfig[] = [
  { key: "firstName", label: "First name", type: "text" },
  { key: "lastName", label: "Last name", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "isActive", label: "Active", type: "enum", options: BOOL_OPTIONS },
  { key: "branchName", label: "Branch", type: "text" },
  { key: "teamName", label: "Team", type: "text" },
];

type SortField =
  | "firstName"
  | "lastName"
  | "email"
  | "isActive"
  | "createdAt"
  | "branch"
  | undefined;

const UserManagementTable: React.FC = () => {
  const { openUserCreate } = useUserModal();
  const { permissions } = useCurrentUser();
  const canAdd = permissions.users.add;

  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebounce(searchInput, { wait: 500 });
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();

  const isFilterActive = (activeFilter?.rules?.length ?? 0) > 0;

  const activeRuleCount = activeFilter?.rules?.length ?? 0;

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await getUsers({
        page: current - 1,
        limit: pageSize,
        sortField: s?.field as SortField,
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
        query: isFilterActive ? undefined : searchText || undefined,
        filters: isFilterActive ? JSON.stringify(activeFilter) : undefined,
      });
      return { total: result.total, list: result.users };
    },
    { refreshDeps: [searchText, activeFilter], defaultPageSize: 10 },
  );

  const { run: runDelete } = useRequest(deleteUser, {
    manual: true,
    onSuccess: () => {
      message.success("User deleted successfully");
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const handleFilterApply = (filter: AdvancedFilter | undefined) => {
    setActiveFilter(filter && filter.rules.length > 0 ? filter : undefined);
  };

  const columns = useUserColumns(refresh, runDelete);

  return (
    <div>
      <Card>
        <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Users ({tableProps.pagination.total ?? 0})
          </Title>
          <Flex align="middle" gap="middle">
            <Tooltip
              title={isFilterActive ? "Clear advanced filters to use simple search" : undefined}
            >
              <Search
                placeholder="Search users..."
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
                  title="Advanced Search — Users"
                  quickFields={[]}
                  ruleFields={USER_FILTER_FIELDS}
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
            {canAdd && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openUserCreate(() => refresh())}
              >
                Add User
              </Button>
            )}
          </Flex>
        </Flex>

        <Table
          columns={columns}
          rowKey="id"
          scroll={{ x: 800 }}
          {...tableProps}
          locale={{
            emptyText:
              searchText && !isFilterActive ? (
                <Empty
                  description={
                    <span>
                      No users found matching <Text strong>"{searchText}"</Text>
                    </span>
                  }
                />
              ) : (
                <Empty description="No users found" />
              ),
          }}
        />
      </Card>
    </div>
  );
};

export default UserManagementTable;
