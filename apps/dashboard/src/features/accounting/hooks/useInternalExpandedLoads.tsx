import { useState } from "react";
import { billingApi } from "../api/billingApi";
import type { InternalBillingBranch, InternalBillingLoad } from "../types/billing";

interface ApiParams {
  query?: string;
  filters?: string;
  [key: string]: string | undefined;
}

export function useInternalExpandedLoads(apiParams: ApiParams) {
  const [loadsByBranch, setLoadsByBranch] = useState<Map<string, InternalBillingLoad[]>>(new Map());

  const resetLoads = () => setLoadsByBranch(new Map());

  const onExpand = async (expanded: boolean, record: InternalBillingBranch) => {
    if (!expanded || loadsByBranch.has(record.branchId)) return;
    const loads = await billingApi.listInternalLoads(record.branchId, apiParams);
    setLoadsByBranch((prev) => new Map(prev).set(record.branchId, loads));
  };

  return { onExpand, resetLoads, loadsByBranch };
}
