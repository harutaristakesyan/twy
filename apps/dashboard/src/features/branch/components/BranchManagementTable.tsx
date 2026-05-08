import { FilterOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useAntdTable, useDebounce, useRequest } from "ahooks";
import { Badge, Button, Card, Flex, Input, message, Space, Table, Tooltip, Typography } from "antd";
import type React from "react";
import { useState } from "react";
import type { AdvancedFilter, FieldConfig } from "@/components/AdvancedFilter";
import { AdvancedFilterDrawer } from "@/components/AdvancedFilter";
import { getUsers } from "@/features/user/api/userApi";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteBranch, getBranches } from "../api/branchApi";
import { useBranchModal } from "../providers/BranchModalProvider";
import { useBranchColumns } from "./useBranchColumns";

const { Title } = Typography;
const { Search } = Input;

type SortField = "name" | "createdAt" | "contact" | undefined;

const BRANCH_FILTER_FIELDS: FieldConfig[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "contact", label: "Contact", type: "text" },
  { key: "ownerEmail", label: "Owner email", type: "text" },
  { key: "ownerFirstName", label: "Owner first name", type: "text" },
  { key: "ownerLastName", label: "Owner last name", type: "text" },
];

const BranchManagementTable: React.FC = () => {
  const { openBranchCreate } = useBranchModal();
  const { permissions } = useCurrentUser();
  const canAdd = permissions.branches.add;

  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebounce(searchInput, { wait: 500 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();

  const isFilterActive = (activeFilter?.rules?.length ?? 0) > 0;

  const activeRuleCount = activeFilter?.rules?.length ?? 0;

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await getBranches({
        page: current - 1,
        limit: pageSize,
        sortField: s?.field as SortField,
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
        query: isFilterActive ? undefined : searchText || undefined,
        filters: isFilterActive ? JSON.stringify(activeFilter) : undefined,
      });
      return { total: result.total, list: result.branches };
    },
    { refreshDeps: [searchText, activeFilter], defaultPageSize: 10 },
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

  const handleFilterApply = (filter: AdvancedFilter) => {
    setActiveFilter(filter.rules.length > 0 ? filter : undefined);
    setDrawerOpen(false);
  };

  const columns = useBranchColumns(refresh, runDelete, owners, ownersLoading);

  return (
    <Card>
      <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Branches ({tableProps.pagination.total ?? 0})
        </Title>
        <Flex align="middle" gap="middle">
          <Tooltip
            title={isFilterActive ? "Clear advanced filters to use simple search" : undefined}
          >
            <Search
              placeholder="Search branches..."
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
              onClick={() =>
                openBranchCreate({ owners, loadingOwners: ownersLoading }, () => refresh())
              }
            >
              Add Branch
            </Button>
          )}
        </Flex>
      </Flex>

      <Table columns={columns} rowKey="id" scroll={{ x: 800 }} {...tableProps} />

      <AdvancedFilterDrawer
        open={drawerOpen}
        title="Advanced Search — Branches"
        fields={BRANCH_FILTER_FIELDS}
        initialFilter={activeFilter}
        onApply={handleFilterApply}
        onClose={() => setDrawerOpen(false)}
      />
    </Card>
  );
};

export default BranchManagementTable;
