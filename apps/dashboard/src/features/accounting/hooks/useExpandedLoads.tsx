import { useCallback, useState } from "react";
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
  const [expandingBranchId, setExpandingBranchId] = useState<string | null>(null);

  const resetLoads = useCallback(() => setLoadsByBranch(new Map()), []);

  const onExpand = useCallback(
    async (expanded: boolean, branchId: string) => {
      if (!expanded) return;
      let alreadyCached = false;
      setLoadsByBranch((prev) => {
        if (prev.has(branchId)) alreadyCached = true;
        return prev;
      });
      if (alreadyCached) return;

      setExpandingBranchId(branchId);
      try {
        const loads = await billingApi.listExternalLoads(branchId, apiParams);
        const userGroups = groupLoadsByCreator(loads);
        setLoadsByBranch((prev) => new Map(prev).set(branchId, { loads, userGroups }));
      } finally {
        setExpandingBranchId(null);
      }
    },
    [apiParams],
  );

  return { onExpand, resetLoads, loadsByBranch, expandingBranchId };
}
