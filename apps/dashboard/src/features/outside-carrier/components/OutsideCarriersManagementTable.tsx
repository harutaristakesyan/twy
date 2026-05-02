import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useAntdTable, useDebounce, useRequest } from "ahooks";
import { Button, Card, Empty, Flex, Input, message, Table, Typography } from "antd";
import type React from "react";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteOutsideCarrier, getOutsideCarriers } from "../api/carrierApi";
import { useOutsideCarrierModal } from "../providers/OutsideCarrierModalProvider";
import { useOutsideCarrierColumns } from "./useOutsideCarrierColumns";

const { Title, Text } = Typography;
const { Search } = Input;

type SortField =
  | "carrierName"
  | "mcDotNumber"
  | "status"
  | "insuranceStatus"
  | "createdAt"
  | undefined;

const OutsideCarriersManagementTable: React.FC = () => {
  const { permissions } = useCurrentUser();
  const { openOutsideCarrierCreate } = useOutsideCarrierModal();
  const { canCreate } = permissions.outsideCarriers;

  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebounce(searchInput, { wait: 500 });

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await getOutsideCarriers({
        page: current - 1,
        limit: pageSize,
        sortField: s?.field as SortField,
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
        query: searchText || undefined,
      });
      return { total: result.total, list: result.carriers };
    },
    { refreshDeps: [searchText], defaultPageSize: 10 },
  );

  const { run: runDelete } = useRequest(deleteOutsideCarrier, {
    manual: true,
    onSuccess: () => {
      message.success("Outside carrier deleted successfully");
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns = useOutsideCarrierColumns(refresh, runDelete);

  return (
    <div>
      <Card>
        <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Outside Carriers ({tableProps.pagination.total ?? 0})
          </Title>
          <Flex align="middle" gap="middle">
            <Search
              placeholder="Search carriers..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
            {canCreate && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openOutsideCarrierCreate(() => refresh())}
              >
                Add Carrier
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
          scroll={{ x: 1200 }}
          {...tableProps}
          pagination={{
            ...tableProps.pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t, range) => `${range[0]}-${range[1]} of ${t} carriers`,
            pageSizeOptions: ["5", "10", "20", "50", "100"],
          }}
          locale={{
            emptyText: searchText ? (
              <Empty
                description={
                  <span>
                    No carriers found matching <Text strong>"{searchText}"</Text>
                  </span>
                }
              />
            ) : (
              <Empty description="No outside carriers found" />
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default OutsideCarriersManagementTable;
