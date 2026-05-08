import { FilterOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useAntdTable, useDebounce, useRequest } from "ahooks";
import {
  Badge,
  Button,
  Card,
  Empty,
  Flex,
  Input,
  message,
  Space,
  Table,
  Tooltip,
  Typography,
} from "antd";
import type React from "react";
import { useState } from "react";
import type { AdvancedFilter, FieldConfig } from "@/components/AdvancedFilter";
import { AdvancedFilterDrawer } from "@/components/AdvancedFilter";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteCarrier, getCarriers } from "../api/carrierApi";
import { useCarrierModal } from "../providers/CarrierModalProvider";
import type { CarrierKind } from "../types/carrier";
import { CarrierStatus, InsuranceStatus } from "../types/carrier";
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

const CARRIER_FILTER_FIELDS: FieldConfig[] = [
  { key: "carrierName", label: "Carrier name", type: "text" },
  { key: "mcDotNumber", label: "MC/DOT #", type: "text" },
  { key: "equipmentType", label: "Equipment type", type: "text" },
  { key: "phone", label: "Phone", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "notes", label: "Notes", type: "text" },
  {
    key: "status",
    label: "Status",
    type: "enum",
    options: [
      { label: "Approved", value: CarrierStatus.APPROVED },
      { label: "Denied", value: CarrierStatus.DENIED },
    ],
  },
  {
    key: "insuranceStatus",
    label: "Insurance status",
    type: "enum",
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
  const { permissions } = useCurrentUser();
  const { openCarrierCreate } = useCarrierModal();
  const addResource = kind === "twy" ? "carriers_twy" : "carriers_outside";
  const canCreate = permissions[addResource]?.add;

  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebounce(searchInput, { wait: 500 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();

  const isFilterActive = (activeFilter?.rules?.length ?? 0) > 0;

  const activeRuleCount = activeFilter?.rules?.length ?? 0;

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await getCarriers({
        kind,
        page: current - 1,
        limit: pageSize,
        sortField: s?.field as SortField,
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
        query: isFilterActive ? undefined : searchText || undefined,
        filters: isFilterActive ? JSON.stringify(activeFilter) : undefined,
      });
      return { total: result.total, list: result.carriers };
    },
    { refreshDeps: [kind, searchText, activeFilter], defaultPageSize: 10 },
  );

  const { run: runDelete } = useRequest(deleteCarrier, {
    manual: true,
    onSuccess: () => {
      message.success("Carrier deleted successfully");
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const handleFilterApply = (filter: AdvancedFilter) => {
    setActiveFilter(filter.rules.length > 0 ? filter : undefined);
    setDrawerOpen(false);
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
            <Tooltip
              title={isFilterActive ? "Clear advanced filters to use simple search" : undefined}
            >
              <Search
                placeholder="Search carriers..."
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
            emptyText:
              searchText && !isFilterActive ? (
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

      <AdvancedFilterDrawer
        open={drawerOpen}
        title={`Advanced Search — ${title}`}
        fields={CARRIER_FILTER_FIELDS}
        initialFilter={activeFilter}
        onApply={handleFilterApply}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};

export default CarrierTable;
