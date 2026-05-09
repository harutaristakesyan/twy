import { FilterOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useAntdTable, useDebounce, useRequest } from "ahooks";
import { App, Badge, Button, Card, Flex, Input, Space, Table, Tooltip, Typography } from "antd";
import type React from "react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AdvancedFilter } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterModal } from "@/components/AdvancedFilter";
import { loadApi } from "@/features/load/api/loadApi";
import {
  LOAD_FILTER_FIELDS,
  LOAD_QUICK_FILTER_FIELDS,
} from "@/features/load/constants/loadAdvancedFilterFields";
import type { GetLoadsParams } from "@/features/load/types/load";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { useLoadColumns } from "./useLoadColumns";

const { Search } = Input;
const { Title } = Typography;

export const LoadManagementTable: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { user, permissions } = useCurrentUser();
  const isBranchAssigned = user?.branch?.id !== undefined && user?.branch?.id !== null;
  const canAdd = permissions.loads.add;

  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebounce(searchInput, { wait: 500 });
  const [modalOpen, setModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();

  const isFilterActive =
    (activeFilter?.rules?.length ?? 0) > 0 || activeFilter?.dateField !== undefined;

  const activeFilterCount =
    (activeFilter?.rules?.length ?? 0) + (activeFilter?.dateField !== undefined ? 1 : 0);

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const validFields: GetLoadsParams["sortField"][] = [
        "referenceNumber",
        "status",
        "createdAt",
        "customer",
      ];
      const field = s?.field as GetLoadsParams["sortField"];
      const result = await loadApi.getAll({
        page: current - 1,
        limit: pageSize,
        query: isFilterActive ? undefined : searchText || undefined,
        filters: isFilterActive ? JSON.stringify(activeFilter) : undefined,
        sortField: s?.order && validFields.includes(field) ? field : undefined,
        sortOrder: s?.order ?? undefined,
      });
      return { total: result.total, list: result.loads };
    },
    { refreshDeps: [searchText, activeFilter], defaultPageSize: 10 },
  );

  const { run: runDelete } = useRequest((id: string) => loadApi.delete(id), {
    manual: true,
    onSuccess: () => {
      message.success("Load deleted successfully");
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const handleFilterApply = useCallback((filter: AdvancedFilter | undefined) => {
    setActiveFilter(filter);
    setModalOpen(false);
  }, []);

  const columns = useLoadColumns(refresh, runDelete);

  return (
    <div>
      <Card>
        <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Loads ({tableProps.pagination.total ?? 0})
          </Title>
          <Flex align="middle" gap="middle">
            <Tooltip title={isFilterActive ? "Clear filters to use simple search" : undefined}>
              <Search
                placeholder="Search loads..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
                disabled={isFilterActive}
                style={{ opacity: isFilterActive ? 0.5 : 1 }}
              />
            </Tooltip>
            <Badge count={isFilterActive ? activeFilterCount : 0} size="small">
              <Space.Compact>
                <Button
                  icon={<FilterOutlined />}
                  type={isFilterActive ? "primary" : "default"}
                  onClick={() => setModalOpen(true)}
                >
                  Filter
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
              <Tooltip
                title={
                  !isBranchAssigned
                    ? "You must be assigned to a branch before creating a load. Please contact your administrator."
                    : undefined
                }
                placement="top"
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate("/loads/create")}
                  disabled={!isBranchAssigned}
                >
                  Create New Load
                </Button>
              </Tooltip>
            )}
          </Flex>
        </Flex>

        <ActiveFilterChips
          filter={activeFilter}
          quickFields={LOAD_QUICK_FILTER_FIELDS}
          ruleFields={LOAD_FILTER_FIELDS}
          onChange={setActiveFilter}
        />

        <Table columns={columns} rowKey="id" scroll={{ x: 2000 }} {...tableProps} />
      </Card>

      <AdvancedFilterModal
        open={modalOpen}
        title="Filter — Loads"
        quickFields={LOAD_QUICK_FILTER_FIELDS}
        ruleFields={LOAD_FILTER_FIELDS}
        initialFilter={activeFilter}
        onApply={handleFilterApply}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};
