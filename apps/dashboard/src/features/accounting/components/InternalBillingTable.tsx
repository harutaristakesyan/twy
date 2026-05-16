import { ChevronDown, ChevronRight } from "@gravity-ui/icons";
import { Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { Filter } from "@/components/Search";
import { ActiveFilters, Search } from "@/components/Search";
import { formatCurrency, formatPercent, renderCurrency } from "@/utils/formatters";
import { billingApi } from "../api/billingApi";
import { useBillingFilters } from "../hooks/useBillingFilters";
import { useInternalExpandedLoads } from "../hooks/useInternalExpandedLoads";
import type { InternalBillingBranch } from "../types/billing";

const thClass =
  "py-2 px-3 text-left text-xs font-medium text-default-600 border-b border-default-200";
const tdClass = "py-2 px-3 text-sm text-default-800 border-b border-default-100";

const BranchRow = ({
  branch,
  onExpand,
  expandedRowRender,
}: {
  branch: InternalBillingBranch;
  onExpand: (expanded: boolean, record: InternalBillingBranch) => Promise<void>;
  expandedRowRender: (record: InternalBillingBranch) => React.ReactNode;
}) => {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    void onExpand(next, branch);
  };

  return (
    <>
      <tr className="cursor-pointer bg-default-50 hover:bg-default-100" onClick={toggle}>
        <td className={`${tdClass} font-bold`}>
          <span className="inline-flex items-center gap-1">
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            {branch.branchName}
            <span className="ml-1 text-xs font-normal text-default-500">
              ({branch.loadCount} loads)
            </span>
          </span>
        </td>
        <td className={tdClass}>{renderCurrency(branch.totalServiceFee)}</td>
        <td className={tdClass}>{renderCurrency(branch.totalCharges)}</td>
        <td className={tdClass}>{formatPercent(branch.avgIncomePercentage)}</td>
        <td className={tdClass}>
          <span
            className={`font-semibold ${branch.totalProfit >= 0 ? "text-success" : "text-danger"}`}
          >
            {formatCurrency(branch.totalProfit)}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="bg-white p-0">
            <div className="px-4 py-2">{expandedRowRender(branch)}</div>
          </td>
        </tr>
      )}
    </>
  );
};

export default function InternalBillingTable() {
  const { activeFilter, activeQuery, apiParams, fields, setActiveFilter, setActiveQuery } =
    useBillingFilters();
  const { onExpand, expandedRowRender, resetLoads } = useInternalExpandedLoads(apiParams);

  const handleQueryChange = (q: string) => {
    setActiveQuery(q);
    resetLoads();
  };

  const handleFilterChange = (filter: Filter | undefined) => {
    setActiveFilter(filter);
    resetLoads();
  };

  const { data: branches, isLoading } = useQuery({
    queryKey: ["billing-internal", apiParams],
    queryFn: () => billingApi.listInternalByBranch(apiParams),
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-base font-semibold">Internal Billing</h2>
        <Search
          query={activeQuery}
          onQueryChange={handleQueryChange}
          placeholder="Search billing..."
          fields={fields}
          filter={activeFilter}
          onFilterChange={handleFilterChange}
        />
      </div>

      <ActiveFilters filter={activeFilter} fields={fields} onChange={handleFilterChange} />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={thClass}>Branch</th>
                <th className={thClass}>Total Service Fee</th>
                <th className={thClass}>Total Charges</th>
                <th className={thClass}>Avg Income %</th>
                <th className={thClass}>Total Profit</th>
              </tr>
            </thead>
            <tbody>
              {(branches ?? []).map((branch) => (
                <BranchRow
                  key={branch.branchId}
                  branch={branch}
                  onExpand={onExpand}
                  expandedRowRender={expandedRowRender}
                />
              ))}
              {(branches ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-default-500">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
