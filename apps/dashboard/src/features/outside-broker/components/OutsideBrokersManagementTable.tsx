import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useAntdTable, useDebounce, useLatest, useRequest, useUpdateEffect } from "ahooks";
import { Button, Card, Empty, Flex, Input, message, Table, Typography } from "antd";
import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBranches } from "@/features/branch/api/branchApi";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteOutsideBroker, getOutsideBrokers } from "../api/brokerApi";
import { useOutsideBrokerModal } from "../providers/OutsideBrokerModalProvider";
import { useOutsideBrokerColumns } from "./useOutsideBrokerColumns";

const { Title, Text } = Typography;
const { Search } = Input;

type SortField = "brokerName" | "mcNumber" | "createdAt" | "branch" | undefined;

const OutsideBrokersManagementTable: React.FC = () => {
  const navigate = useNavigate();
  const { permissions } = useCurrentUser();
  const { openOutsideBrokerCreate } = useOutsideBrokerModal();
  const canCreate = permissions.brokers.add;

  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebounce(searchInput, { wait: 500 });
  const searchTextRef = useLatest(searchText);

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await getOutsideBrokers({
        page: current - 1,
        limit: pageSize,
        sortField: s?.field as SortField,
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
        query: searchTextRef.current || undefined,
      });
      return { total: result.total, list: result.brokers };
    },
    { defaultPageSize: 10 },
  );

  useUpdateEffect(() => {
    void refresh();
  }, [searchText]);

  const { data: branches = [], loading: branchesLoading } = useRequest(
    async () => (await getBranches({ limit: 100 })).branches ?? [],
    { cacheKey: "broker-branches" },
  );

  const { run: runDelete } = useRequest(deleteOutsideBroker, {
    manual: true,
    onSuccess: () => {
      message.success("Outside broker deleted successfully");
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns = useOutsideBrokerColumns(refresh, runDelete, branches, branchesLoading);

  return (
    <div>
      <Card>
        <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Outside Brokers ({tableProps.pagination.total ?? 0})
          </Title>
          <Flex align="middle" gap="middle">
            <Search
              placeholder="Search brokers..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
            {canCreate && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() =>
                  openOutsideBrokerCreate({ branches, loadingBranches: branchesLoading }, () => {
                    void refresh();
                    navigate("/outside-brokers/requests");
                  })
                }
              >
                Add Broker
              </Button>
            )}
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
            showTotal: (t, range) => `${range[0]}-${range[1]} of ${t} brokers`,
            pageSizeOptions: ["5", "10", "20", "50", "100"],
          }}
          locale={{
            emptyText: searchText ? (
              <Empty
                description={
                  <span>
                    No brokers found matching <Text strong>"{searchText}"</Text>
                  </span>
                }
              />
            ) : (
              <Empty description="No outside brokers found" />
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default OutsideBrokersManagementTable;
