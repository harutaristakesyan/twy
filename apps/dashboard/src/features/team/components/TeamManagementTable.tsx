import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useAntdTable, useDebounce, useRequest } from "ahooks";
import { Button, Card, Empty, Flex, Input, message, Table, Typography } from "antd";
import type React from "react";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteTeam, getTeams } from "../api/teamApi";
import { useTeamModal } from "../providers/TeamModalProvider";
import { useTeamColumns } from "./useTeamColumns";

const { Title, Text } = Typography;
const { Search } = Input;

const TeamManagementTable: React.FC = () => {
  const { permissions } = useCurrentUser();
  const { openTeamCreate } = useTeamModal();
  const canAdd = permissions.teams.add;

  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebounce(searchInput, { wait: 500 });

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await getTeams({
        page: current - 1,
        limit: pageSize,
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
        query: searchText || undefined,
      });
      return { total: result.total, list: result.teams };
    },
    { refreshDeps: [searchText], defaultPageSize: 10 },
  );

  const { run: runDelete } = useRequest(deleteTeam, {
    manual: true,
    onSuccess: () => {
      message.success("Team deleted successfully");
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns = useTeamColumns(refresh, runDelete);

  return (
    <div>
      <Card>
        <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Teams ({tableProps.pagination.total ?? 0})
          </Title>
          <Flex align="middle" gap="middle">
            <Search
              placeholder="Search teams..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
            {canAdd && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openTeamCreate(refresh)}
              >
                Add Team
              </Button>
            )}
          </Flex>
        </Flex>

        <Table
          columns={columns}
          rowKey="id"
          scroll={{ x: 900 }}
          {...tableProps}
          pagination={{
            ...tableProps.pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t, range) => `${range[0]}-${range[1]} of ${t} teams`,
            pageSizeOptions: ["5", "10", "20", "50"],
          }}
          locale={{
            emptyText: searchText ? (
              <Empty
                description={
                  <span>
                    No teams found matching <Text strong>"{searchText}"</Text>
                  </span>
                }
              />
            ) : (
              <Empty description="No teams found" />
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default TeamManagementTable;
