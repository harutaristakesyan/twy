import { PlusOutlined } from "@ant-design/icons";
import { useAntdTable, useRequest } from "ahooks";
import { App, Button, Card, Flex, Table, Typography } from "antd";
import type React from "react";
import { useState } from "react";
import type { AdvancedFilter } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { getUsers } from "@/features/user/api/userApi";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteBranch, getBranches } from "../api/branchApi";
import { useBranchModal } from "../providers/BranchModalProvider";
import { useBranchColumns } from "./useBranchColumns";

const { Title } = Typography;

type SortField = "name" | "createdAt" | "contact" | undefined;

const BranchManagementTable: React.FC = () => {
  const { message } = App.useApp();
  const { openBranchCreate } = useBranchModal();
  const { permissions } = useCurrentUser();
  const canAdd = permissions.branches.add;

  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();
  const [activeQuery, setActiveQuery] = useState("");

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await getBranches({
        page: current - 1,
        limit: pageSize,
        sortField: s?.field as SortField,
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
        query: activeQuery || undefined,
        filters: activeFilter ? JSON.stringify(activeFilter) : undefined,
      });
      return { total: result.total, list: result.branches };
    },
    { refreshDeps: [activeQuery, activeFilter], defaultPageSize: 10 },
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

  const handleFilterApply = (filter: AdvancedFilter | undefined, query: string | undefined) => {
    setActiveFilter(filter);
    setActiveQuery(query ?? "");
  };

  const columns = useBranchColumns(refresh, runDelete, owners, ownersLoading);

  return (
    <Card>
      <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Branches ({tableProps.pagination.total ?? 0})
        </Title>
        <Flex align="middle" gap="middle">
          <AdvancedFilterPopover
            initialFilter={activeFilter}
            initialQuery={activeQuery}
            onApply={handleFilterApply}
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
        </Flex>
      </Flex>

      <ActiveFilterChips
        filter={activeFilter}
        query={activeQuery}
        onChange={setActiveFilter}
        onClearQuery={() => setActiveQuery("")}
      />

      <Table columns={columns} rowKey="id" scroll={{ x: 800 }} {...tableProps} />
    </Card>
  );
};

export default BranchManagementTable;
