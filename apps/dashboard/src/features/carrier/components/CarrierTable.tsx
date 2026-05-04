import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useAntdTable, useDebounce, useLatest, useRequest, useUpdateEffect } from "ahooks";
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
  const addResource = kind === "twy" ? "carriers_twy" : "carriers_outside";
  const canCreate = permissions[addResource]?.add;

  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebounce(searchInput, { wait: 500 });
  const searchTextRef = useLatest(searchText);

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await getCarriers({
        kind,
        page: current - 1,
        limit: pageSize,
        sortField: s?.field as SortField,
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
        query: searchTextRef.current || undefined,
      });
      return { total: result.total, list: result.carriers };
    },
    { refreshDeps: [kind], defaultPageSize: 10 },
  );

  useUpdateEffect(() => {
    void refresh();
  }, [searchText]);

  const { run: runDelete } = useRequest(deleteCarrier, {
    manual: true,
    onSuccess: () => {
      message.success("Carrier deleted successfully");
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns = useCarrierColumns(refresh, runDelete, kind);

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
          </Flex>
        </Flex>

        <Table
          columns={columns}
          rowKey="id"
          scroll={{ x: 1200 }}
          {...tableProps}
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
