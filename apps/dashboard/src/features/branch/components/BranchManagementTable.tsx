import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useAntdTable, useDebounce, useRequest } from "ahooks";
import { Button, Card, Flex, Input, message, Table, Typography } from "antd";
import type React from "react";
import { useState } from "react";
import { getUsers } from "@/features/user/api/userApi";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteBranch, getBranches } from "../api/branchApi";
import { useBranchModal } from "../providers/BranchModalProvider";
import { useBranchColumns } from "./useBranchColumns";

const { Title } = Typography;
const { Search } = Input;

type SortField = "name" | "owner" | "createdAt" | undefined;

const BranchManagementTable: React.FC = () => {
  const { openBranchCreate } = useBranchModal();
  const { permissions } = useCurrentUser();
  const canAdd = permissions.branches.add;

  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebounce(searchInput, { wait: 500 });

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await getBranches({
        page: current - 1,
        limit: pageSize,
        sortField: s?.field as SortField,
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
        query: searchText || undefined,
      });
      return { total: result.total, list: result.branches };
    },
    { refreshDeps: [searchText], defaultPageSize: 10 },
  );

  const { data: owners = [], loading: ownersLoading } = useRequest(
    async () => {
      const response = await getUsers({ limit: 100 });
      return response.users;
    },
    { cacheKey: "branch-owners" },
  );

  const { run: runDelete } = useRequest(deleteBranch, {
    manual: true,
    onSuccess: () => {
      message.success("Branch deleted successfully");
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns = useBranchColumns(refresh, runDelete, owners, ownersLoading);

  return (
    <Card>
      <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Branches ({tableProps.pagination.total ?? 0})
        </Title>
        <Flex align="middle" gap="middle">
          <Search
            placeholder="Search branches..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            prefix={<SearchOutlined />}
            allowClear
          />
          {canAdd && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() =>
                openBranchCreate({ owners, loadingOwners: ownersLoading }, () => refresh())
              }
            >
              Add Branch
            </Button>
          )}
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
          showTotal: (t, range) => `${range[0]}-${range[1]} of ${t} branches`,
          pageSizeOptions: ["5", "10", "20", "50", "100"],
        }}
      />
    </Card>
  );
};

export default BranchManagementTable;
