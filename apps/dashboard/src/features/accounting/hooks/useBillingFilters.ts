import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { Filter, FilterField } from "@/components/Search";
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
  const [activeFilter, setActiveFilter] = useState<Filter | undefined>();
  const [activeQuery, setActiveQuery] = useState("");

  const { data: branchesData } = useQuery({
    queryKey: ["branches-filter"],
    queryFn: () => getBranches({ limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: carriersData } = useQuery({
    queryKey: ["carriers-outside-filter"],
    queryFn: () => getCarriers({ kind: "outside", limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: brokersData } = useQuery({
    queryKey: ["brokers-filter"],
    queryFn: () => getOutsideBrokers({ limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });

  const fields: FilterField[] = [
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
  ];

  const apiParams = {
    query: activeQuery || undefined,
    filters: activeFilter ? JSON.stringify(activeFilter) : undefined,
  };

  return {
    activeFilter,
    activeQuery,
    apiParams,
    fields,
    setActiveFilter,
    setActiveQuery,
  };
}
