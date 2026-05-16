import { useState } from "react";
import { billingApi } from "../api/billingApi";
import type { ExternalBillingLoad } from "../types/billing";
import { type ExternalBillingUserGroup, groupLoadsByCreator } from "./groupLoadsByCreator";

export interface ExternalBillingTreeBranchData {
  loads: ExternalBillingLoad[];
  userGroups: ExternalBillingUserGroup[];
}

interface ApiParams {
  query?: string;
  filters?: string;
  [key: string]: string | undefined;
}

export function useExpandedLoads(apiParams: ApiParams) {
  const [loadsByBranch, setLoadsByBranch] = useState<Map<string, ExternalBillingTreeBranchData>>(
    new Map(),
  );

  const resetLoads = () => setLoadsByBranch(new Map());

  const onExpand = async (expanded: boolean, branchId: string) => {
    if (!expanded || loadsByBranch.has(branchId)) return;
    const loads = await billingApi.listExternalLoads(branchId, apiParams);
    const userGroups = groupLoadsByCreator(loads);
    setLoadsByBranch((prev) => new Map(prev).set(branchId, { loads, userGroups }));
  };

  return { onExpand, resetLoads, loadsByBranch };
}
