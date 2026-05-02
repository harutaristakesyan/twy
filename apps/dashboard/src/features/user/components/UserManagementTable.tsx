import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useAntdTable, useDebounce, useRequest } from "ahooks";
import { Button, Card, Flex, Input, message, Table, Typography } from "antd";
import type React from "react";
import { useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteUser, getUsers } from "../api/userApi";
import { useUserModal } from "../providers/UserModalProvider";
import { useUserColumns } from "./useUserColumns";

const { Title } = Typography;
const { Search } = Input;

type SortField =
  | "firstName"
  | "lastName"
  | "email"
  | "role"
  | "isActive"
  | "createdAt"
  | "branch"
  | undefined;

const UserManagementTable: React.FC = () => {
  const { openUserCreate } = useUserModal();

  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebounce(searchInput, { wait: 500 });

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await getUsers({
        page: current - 1,
        limit: pageSize,
        sortField: s?.field as SortField,
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
        query: searchText || undefined,
      });
      return { total: result.total, list: result.users };
    },
    { refreshDeps: [searchText], defaultPageSize: 10 },
  );

  const { run: runDelete } = useRequest(deleteUser, {
    manual: true,
    onSuccess: () => {
      message.success("User deleted successfully");
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns = useUserColumns(refresh, runDelete);

  return (
    <div>
      <Card>
        <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Users ({tableProps.pagination.total ?? 0})
          </Title>
          <Flex align="middle" gap="middle">
            <Search
              placeholder="Search users..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openUserCreate(() => refresh())}
            >
              Add User
            </Button>
            <Button icon={<ReloadOutlined />} onClick={refresh} loading={tableProps.loading}>
              Refresh
            </Button>
          </Flex>
        </Flex>

        <Table
          columns={columns}
          rowKey="id"
          scroll={{ x: 800 }}
          {...tableProps}
          pagination={{
            ...tableProps.pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t, range) => `${range[0]}-${range[1]} of ${t} users`,
            pageSizeOptions: ["5", "10", "20", "50", "100"],
          }}
        />
      </Card>
    </div>
  );
};

export default UserManagementTable;
