import { PlusOutlined } from "@ant-design/icons";
import { useAntdTable, useRequest } from "ahooks";
import { App, Button, Card, Empty, Flex, Table, Typography } from "antd";
import type React from "react";
import { useState } from "react";
import type { AdvancedFilter, FilterField } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteCarrier, getCarriers } from "../api/carrierApi";
import { useCarrierModal } from "../providers/CarrierModalProvider";
import type { CarrierKind } from "../types/carrier";
import { CarrierStatus, InsuranceStatus } from "../types/carrier";
import { useCarrierColumns } from "./useCarrierColumns";

const { Title } = Typography;

type SortField =
  | "carrierName"
  | "mcDotNumber"
  | "status"
  | "insuranceStatus"
  | "createdAt"
  | undefined;

const FILTER_FIELDS: FilterField[] = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Approved", value: CarrierStatus.APPROVED },
      { label: "Denied", value: CarrierStatus.DENIED },
    ],
  },
  {
    key: "insuranceStatus",
    label: "Insurance status",
    type: "select",
    options: [
      { label: "Valid", value: InsuranceStatus.VALID },
      { label: "Expired", value: InsuranceStatus.EXPIRED },
      { label: "Pending", value: InsuranceStatus.PENDING },
    ],
  },
];

interface CarrierTableProps {
  kind: CarrierKind;
}

const CarrierTable: React.FC<CarrierTableProps> = ({ kind }) => {
  const { message } = App.useApp();
  const { permissions } = useCurrentUser();
  const { openCarrierCreate } = useCarrierModal();
  const addResource = kind === "twy" ? "carriers_twy" : "carriers_outside";
  const canCreate = permissions[addResource]?.add;

  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();
  const [activeQuery, setActiveQuery] = useState("");

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await getCarriers({
        kind,
        page: current - 1,
        limit: pageSize,
        sortField: s?.field as SortField,
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
        query: activeQuery || undefined,
        filters: activeFilter ? JSON.stringify(activeFilter) : undefined,
      });
      return { total: result.total, list: result.carriers };
    },
    { refreshDeps: [kind, activeQuery, activeFilter], defaultPageSize: 10 },
  );

  const { run: runDelete } = useRequest(deleteCarrier, {
    manual: true,
    onSuccess: () => {
      message.success("Carrier deleted successfully");
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const handleFilterApply = (filter: AdvancedFilter | undefined, query: string | undefined) => {
    setActiveFilter(filter);
    setActiveQuery(query ?? "");
  };

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
            <AdvancedFilterPopover
              fields={FILTER_FIELDS}
              initialFilter={activeFilter}
              initialQuery={activeQuery}
              onApply={handleFilterApply}
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

        <ActiveFilterChips
          filter={activeFilter}
          fields={FILTER_FIELDS}
          query={activeQuery}
          onChange={setActiveFilter}
          onClearQuery={() => setActiveQuery("")}
        />

        <Table
          columns={columns}
          rowKey="id"
          scroll={{ x: 1200 }}
          {...tableProps}
          locale={{ emptyText: <Empty description={`No ${title.toLowerCase()} found`} /> }}
        />
      </Card>
    </div>
  );
};

export default CarrierTable;
