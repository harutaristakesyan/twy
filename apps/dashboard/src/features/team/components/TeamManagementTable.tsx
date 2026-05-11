import { PlusOutlined } from "@ant-design/icons";
import { useAntdTable, useRequest } from "ahooks";
import { App, Button, Card, Empty, Flex, Table, Typography } from "antd";
import type React from "react";
import { useState } from "react";
import type { AdvancedFilter, FilterField } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteTeam, getTeams } from "../api/teamApi";
import { useTeamModal } from "../providers/TeamModalProvider";
import { useTeamColumns } from "./useTeamColumns";

const { Title } = Typography;

const BOOL_OPTIONS = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

const FILTER_FIELDS: FilterField[] = [
  { key: "branchRestricted", label: "Branch restricted", type: "select", options: BOOL_OPTIONS },
  { key: "onlyOwnData", label: "Only own data", type: "select", options: BOOL_OPTIONS },
];

const TeamManagementTable: React.FC = () => {
  const { message } = App.useApp();
  const { permissions } = useCurrentUser();
  const { openTeamCreate } = useTeamModal();
  const canAdd = permissions.teams.add;

  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();
  const [activeQuery, setActiveQuery] = useState("");

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await getTeams({
        page: current - 1,
        limit: pageSize,
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
        query: activeQuery || undefined,
        filters: activeFilter ? JSON.stringify(activeFilter) : undefined,
      });
      return { total: result.total, list: result.teams };
    },
    { refreshDeps: [activeQuery, activeFilter], defaultPageSize: 10 },
  );

  const { run: runDelete } = useRequest(deleteTeam, {
    manual: true,
    onSuccess: () => {
      message.success("Team deleted successfully");
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const handleFilterApply = (filter: AdvancedFilter | undefined, query: string | undefined) => {
    setActiveFilter(filter);
    setActiveQuery(query ?? "");
  };

  const columns = useTeamColumns(refresh, runDelete);

  return (
    <div>
      <Card>
        <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Teams ({tableProps.pagination.total ?? 0})
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
                onClick={() => openTeamCreate(refresh)}
              >
                Add Team
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
          scroll={{ x: 900 }}
          {...tableProps}
          locale={{ emptyText: <Empty description="No teams found" /> }}
        />
      </Card>
    </div>
  );
};

export default TeamManagementTable;
