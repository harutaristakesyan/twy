import { useRequest } from "ahooks";
import { useMemo, useState } from "react";
import type { AdvancedFilter, FilterField } from "@/components/AdvancedFilter";
import { getBranches } from "@/features/branch/api/branchApi";
import { getCarriers } from "@/features/carrier/api/carrierApi";
import { getOutsideBrokers } from "@/features/outside-broker/api/brokerApi";
import { STATUS_LABEL } from "../components/PaymentStatusTag";
import type { PaymentStatus } from "../types/paymentOrder";

const PAYMENT_STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as PaymentStatus[]).map((value) => ({
  value,
  label: STATUS_LABEL[value],
}));

export function useBillingFilters() {
  const [activeFilter, setActiveFilter] = useState<AdvancedFilter | undefined>();
  const [activeQuery, setActiveQuery] = useState("");

  const { data: branchesData } = useRequest(() => getBranches({ limit: 200 }), {
    cacheKey: "branches-for-filter",
  });
  const { data: carriersData } = useRequest(() => getCarriers({ kind: "outside", limit: 200 }), {
    cacheKey: "carriers-outside-for-filter",
  });
  const { data: brokersData } = useRequest(() => getOutsideBrokers({ limit: 200 }), {
    cacheKey: "brokers-for-filter",
  });

  const fields: FilterField[] = useMemo(
    () => [
      {
        key: "branchId",
        label: "Branch",
        type: "select",
        options: branchesData?.branches.map((b) => ({ label: b.name, value: b.id })) ?? [],
        placeholder: "All branches",
      },
      { key: "createdAt", label: "Date Range", type: "dateRange" },
      { key: "status", label: "Status", type: "multiSelect", options: PAYMENT_STATUS_OPTIONS },
      {
        key: "broker",
        label: "Broker",
        type: "select",
        options:
          brokersData?.brokers.map((b) => ({ label: b.brokerName, value: b.brokerName })) ?? [],
        placeholder: "All brokers",
      },
      {
        key: "carrierId",
        label: "Carrier",
        type: "select",
        options: carriersData?.carriers.map((c) => ({ label: c.carrierName, value: c.id })) ?? [],
        placeholder: "All carriers",
      },
    ],
    [branchesData, carriersData, brokersData],
  );

  const apiParams = useMemo(
    () => ({
      query: activeQuery || undefined,
      filters: activeFilter ? JSON.stringify(activeFilter) : undefined,
    }),
    [activeFilter, activeQuery],
  );

  const handleFilterApply = (filter: AdvancedFilter | undefined, query: string | undefined) => {
    setActiveFilter(filter);
    setActiveQuery(query ?? "");
  };

  return {
    activeFilter,
    activeQuery,
    apiParams,
    fields,
    handleFilterApply,
    setActiveFilter,
    setActiveQuery,
  };
}
