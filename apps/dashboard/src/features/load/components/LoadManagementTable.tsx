import { PlusOutlined } from "@ant-design/icons";
import { useAntdTable, useRequest } from "ahooks";
import { App, Button, Card, Flex, Table, Tooltip, Typography } from "antd";
import type React from "react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AdvancedFilter, FilterField } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { loadApi } from "@/features/load/api/loadApi";
import type { GetLoadsParams } from "@/features/load/types/load";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { useLoadColumns } from "./useLoadColumns";

const { Title } = Typography;

const FILTER_FIELDS: FilterField[] = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Pending", value: "Pending" },
      { label: "Approved", value: "Approved" },
      { label: "Approved Paid", value: "ApprovedPaid" },
      { label: "Denied", value: "Denied" },
      { label: "Hold", value: "Hold" },
    ],
  },
  { key: "createdAt", label: "Created date", type: "dateRange" },
];

export const LoadManagementTable: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { user, permissions } = useCurrentUser();
  const isBranchAssigned = user?.branch?.id !== undefined && user?.branch?.id !== null;
  const canAdd = permissions.loads.add;

  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();
  const [activeQuery, setActiveQuery] = useState("");

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
        query: activeQuery || undefined,
        filters: activeFilter ? JSON.stringify(activeFilter) : undefined,
        sortField: s?.order && validFields.includes(field) ? field : undefined,
        sortOrder: s?.order ?? undefined,
      });
      return { total: result.total, list: result.loads };
    },
    { refreshDeps: [activeQuery, activeFilter], defaultPageSize: 10 },
  );

  const { run: runDelete } = useRequest((id: string) => loadApi.delete(id), {
    manual: true,
    onSuccess: () => {
      message.success("Load deleted successfully");
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const handleFilterApply = useCallback(
    (filter: AdvancedFilter | undefined, query: string | undefined) => {
      setActiveFilter(filter);
      setActiveQuery(query ?? "");
    },
    [],
  );

  const columns = useLoadColumns(refresh, runDelete);

  return (
    <div>
      <Card>
        <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Loads ({tableProps.pagination.total ?? 0})
          </Title>
          <Flex align="middle" gap="middle">
            <AdvancedFilterPopover
              fields={FILTER_FIELDS}
              initialFilter={activeFilter}
              initialQuery={activeQuery}
              onApply={handleFilterApply}
            />
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
          fields={FILTER_FIELDS}
          query={activeQuery}
          onChange={setActiveFilter}
          onClearQuery={() => setActiveQuery("")}
        />

        <Table columns={columns} rowKey="id" scroll={{ x: 2000 }} {...tableProps} />
      </Card>
    </div>
  );
};
