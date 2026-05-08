import { FilterOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useAntdTable, useDebounce, useRequest } from "ahooks";
import { App, Badge, Button, Card, Flex, Input, Space, Table, Tooltip, Typography } from "antd";
import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AdvancedFilter, DateFieldConfig, FieldConfig } from "@/components/AdvancedFilter";
import { AdvancedFilterDrawer } from "@/components/AdvancedFilter";
import { loadApi } from "@/features/load/api/loadApi";
import type { GetLoadsParams } from "@/features/load/types/load";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { useLoadColumns } from "./useLoadColumns";

const { Search } = Input;
const { Title } = Typography;

const LOAD_FILTER_FIELDS: FieldConfig[] = [
  { key: "referenceNumber", label: "Reference #", type: "text" },
  { key: "customer", label: "Customer", type: "text" },
  { key: "contactName", label: "Contact Name", type: "text" },
  { key: "carrier", label: "Carrier", type: "text" },
  {
    key: "status",
    label: "Status",
    type: "enum",
    options: [
      { label: "Pending", value: "Pending" },
      { label: "Approved", value: "Approved" },
      { label: "Denied", value: "Denied" },
    ],
  },
  { key: "paymentMethod", label: "Payment Method", type: "text" },
  { key: "paymentTerms", label: "Payment Terms", type: "text" },
  { key: "loadType", label: "Load Type", type: "text" },
  { key: "serviceType", label: "Service Type", type: "text" },
  { key: "commodity", label: "Commodity", type: "text" },
  { key: "carrierRate", label: "Carrier Rate", type: "number" },
  { key: "customerRate", label: "Customer Rate", type: "number" },
];

const LOAD_DATE_FIELDS: DateFieldConfig[] = [
  { key: "createdAt", label: "Created At" },
  { key: "updatedAt", label: "Updated At" },
];

export const LoadManagementTable: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { user, permissions } = useCurrentUser();
  const isBranchAssigned = user?.branch?.id !== undefined && user?.branch?.id !== null;
  const canAdd = permissions.loads.add;

  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebounce(searchInput, { wait: 500 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();

  const isFilterActive =
    (activeFilter?.rules?.length ?? 0) > 0 ||
    activeFilter?.dateFrom !== undefined ||
    activeFilter?.dateTo !== undefined;

  const activeRuleCount =
    (activeFilter?.rules?.length ?? 0) + ((activeFilter?.dateFrom ?? activeFilter?.dateTo) ? 1 : 0);

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

  const handleFilterApply = (filter: AdvancedFilter) => {
    const hasRules = filter.rules.length > 0;
    const hasDate = filter.dateFrom !== undefined || filter.dateTo !== undefined;
    setActiveFilter(hasRules || hasDate ? filter : undefined);
    setDrawerOpen(false);
  };

  const columns = useLoadColumns(refresh, runDelete);

  return (
    <div>
      <Card>
        <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Loads ({tableProps.pagination.total ?? 0})
          </Title>
          <Flex align="middle" gap="middle">
            <Tooltip
              title={isFilterActive ? "Clear advanced filters to use simple search" : undefined}
            >
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

        <Table columns={columns} rowKey="id" scroll={{ x: 2000 }} {...tableProps} />
      </Card>

      <AdvancedFilterDrawer
        open={drawerOpen}
        title="Advanced Search — Loads"
        fields={LOAD_FILTER_FIELDS}
        dateFields={LOAD_DATE_FIELDS}
        onApply={handleFilterApply}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};
