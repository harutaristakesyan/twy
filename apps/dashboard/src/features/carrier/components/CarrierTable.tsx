import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useAntdTable, useDebounce, useRequest } from "ahooks";
import { Button, Card, Empty, Flex, Input, message, Table, Typography } from "antd";
import type React from "react";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteCarrier, getCarriers } from "../api/carrierApi";
import { useCarrierModal } from "../providers/CarrierModalProvider";
import type { CarrierKind } from "../types/carrier";
import { useCarrierColumns } from "./useCarrierColumns";

const { Title, Text } = Typography;
const { Search } = Input;

type SortField =
  | "carrierName"
  | "mcDotNumber"
  | "status"
  | "insuranceStatus"
  | "createdAt"
  | undefined;

interface CarrierTableProps {
  kind: CarrierKind;
}

const CarrierTable: React.FC<CarrierTableProps> = ({ kind }) => {
  const { permissions } = useCurrentUser();
  const { openCarrierCreate } = useCarrierModal();
  const canCreate = permissions.carriers.add;

  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebounce(searchInput, { wait: 500 });

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await getCarriers({
        kind,
        page: current - 1,
        limit: pageSize,
        sortField: s?.field as SortField,
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
        query: searchText || undefined,
      });
      return { total: result.total, list: result.carriers };
    },
    { refreshDeps: [searchText, kind], defaultPageSize: 10 },
  );

  const { run: runDelete } = useRequest(deleteCarrier, {
    manual: true,
    onSuccess: () => {
      message.success("Carrier deleted successfully");
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns = useCarrierColumns(refresh, runDelete);

  const title = kind === "twy" ? "Twy Carriers" : "Outside Carriers";

  return (
    <div>
      <Card>
        <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            {title} ({tableProps.pagination.total ?? 0})
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
                onClick={() => openCarrierCreate(kind, () => refresh())}
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
              <Empty description={`No ${title.toLowerCase()} found`} />
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default CarrierTable;
