import { PlusOutlined } from "@ant-design/icons";
import { useAntdTable, useRequest } from "ahooks";
import { App, Button, Card, Empty, Flex, Table, Typography } from "antd";
import type React from "react";
import { useState } from "react";
import type { AdvancedFilter, FilterField } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteUser, getUsers } from "../api/userApi";
import { useUserModal } from "../providers/UserModalProvider";
import { useUserColumns } from "./useUserColumns";

const { Title } = Typography;

const BOOL_OPTIONS = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

const FILTER_FIELDS: FilterField[] = [
  { key: "isActive", label: "Active", type: "select", options: BOOL_OPTIONS },
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
  const { message } = App.useApp();
  const { openUserCreate } = useUserModal();
  const { permissions } = useCurrentUser();
  const canAdd = permissions.users.add;

  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();
  const [activeQuery, setActiveQuery] = useState("");

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await getUsers({
        page: current - 1,
        limit: pageSize,
        sortField: s?.field as SortField,
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
        query: activeQuery || undefined,
        filters: activeFilter ? JSON.stringify(activeFilter) : undefined,
      });
      return { total: result.total, list: result.users };
    },
    { refreshDeps: [activeQuery, activeFilter], defaultPageSize: 10 },
  );

  const { run: runDelete } = useRequest(deleteUser, {
    manual: true,
    onSuccess: () => {
      message.success("User deleted successfully");
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const handleFilterApply = (filter: AdvancedFilter | undefined, query: string | undefined) => {
    setActiveFilter(filter);
    setActiveQuery(query ?? "");
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
            <AdvancedFilterPopover
              fields={FILTER_FIELDS}
              initialFilter={activeFilter}
              initialQuery={activeQuery}
              onApply={handleFilterApply}
            />
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
          scroll={{ x: 800 }}
          {...tableProps}
          locale={{ emptyText: <Empty description="No users found" /> }}
        />
      </Card>
    </div>
  );
};

export default UserManagementTable;
