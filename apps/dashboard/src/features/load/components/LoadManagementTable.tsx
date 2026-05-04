import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useAntdTable, useDebounce, useRequest } from "ahooks";
import { App, Button, Card, Flex, Input, Table, Tooltip, Typography } from "antd";
import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadApi } from "@/features/load/api/loadApi";
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
        query: searchText || undefined,
        sortField: s?.order && validFields.includes(field) ? field : undefined,
        sortOrder: s?.order ?? undefined,
      });
      return { total: result.total, list: result.loads };
    },
    { refreshDeps: [searchText], defaultPageSize: 10 },
  );

  const { run: runDelete } = useRequest((id: string) => loadApi.delete(id), {
    manual: true,
    onSuccess: () => {
      message.success("Load deleted successfully");
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns = useLoadColumns(refresh, runDelete);

  return (
    <div>
      <Card>
        <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Loads ({tableProps.pagination.total ?? 0})
          </Title>
          <Flex align="middle" gap="middle">
            <Search
              placeholder="Search loads..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
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

        <Table columns={columns} rowKey="id" scroll={{ x: 2000 }} {...tableProps} />
      </Card>
    </div>
  );
};
