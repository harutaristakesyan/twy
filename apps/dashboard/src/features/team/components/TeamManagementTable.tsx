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
import { AdvancedFilterDrawer } from "@/components/AdvancedFilter";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteTeam, getTeams } from "../api/teamApi";
import { useTeamModal } from "../providers/TeamModalProvider";
import { useTeamColumns } from "./useTeamColumns";

const { Title, Text } = Typography;
const { Search } = Input;

const BOOL_OPTIONS = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

const TEAM_FILTER_FIELDS: FieldConfig[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "branchRestricted", label: "Branch restricted", type: "enum", options: BOOL_OPTIONS },
  { key: "onlyOwnData", label: "Only own data", type: "enum", options: BOOL_OPTIONS },
];

const TeamManagementTable: React.FC = () => {
  const { permissions } = useCurrentUser();
  const { openTeamCreate } = useTeamModal();
  const canAdd = permissions.teams.add;

  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebounce(searchInput, { wait: 500 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();

  const isFilterActive = (activeFilter?.rules?.length ?? 0) > 0;

  const activeRuleCount = activeFilter?.rules?.length ?? 0;

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await getTeams({
        page: current - 1,
        limit: pageSize,
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
        query: isFilterActive ? undefined : searchText || undefined,
        filters: isFilterActive ? JSON.stringify(activeFilter) : undefined,
      });
      return { total: result.total, list: result.teams };
    },
    { refreshDeps: [searchText, activeFilter], defaultPageSize: 10 },
  );

  const { run: runDelete } = useRequest(deleteTeam, {
    manual: true,
    onSuccess: () => {
      message.success("Team deleted successfully");
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const handleFilterApply = (filter: AdvancedFilter) => {
    setActiveFilter(filter.rules.length > 0 ? filter : undefined);
    setDrawerOpen(false);
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
            <Tooltip
              title={isFilterActive ? "Clear advanced filters to use simple search" : undefined}
            >
              <Search
                placeholder="Search teams..."
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
                <Button
                  icon={<FilterOutlined />}
                  type={isFilterActive ? "primary" : "default"}
                  onClick={() => setDrawerOpen(true)}
                >
                  Advanced Search
                </Button>
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
          locale={{
            emptyText:
              searchText && !isFilterActive ? (
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

      <AdvancedFilterDrawer
        open={drawerOpen}
        title="Advanced Search — Teams"
        fields={TEAM_FILTER_FIELDS}
        initialFilter={activeFilter}
        onApply={handleFilterApply}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};

export default TeamManagementTable;
