import { ChevronDown, ChevronRight } from "@gravity-ui/icons";
import { Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { AdvancedFilter } from "@/components/AdvancedFilter";
import { ActiveFilterChips, AdvancedFilterPopover } from "@/components/AdvancedFilter";
import { formatCurrency, renderCurrency } from "@/utils/formatters";
import { billingApi } from "../api/billingApi";
import type { ExternalBillingUserGroup } from "../hooks/groupLoadsByCreator";
import { useBillingFilters } from "../hooks/useBillingFilters";
import { useExpandedLoads } from "../hooks/useExpandedLoads";
import type { ExternalBillingBranch, ExternalBillingLoad } from "../types/billing";
import PaymentStatusTag from "./PaymentStatusTag";

const renderDate = (v: string | null | undefined) =>
  v
    ? new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "—";

const renderOwed = (v: number) => (
  <span className={`font-semibold ${v > 0 ? "text-danger" : "text-success"}`}>
    {formatCurrency(v)}
  </span>
);

const thClass =
  "py-2 px-3 text-left text-xs font-medium text-default-600 border-b border-default-200";
const tdClass = "py-2 px-3 text-sm text-default-800 border-b border-default-100";

const LoadRow = ({ load }: { load: ExternalBillingLoad }) => (
  <tr className="hover:bg-default-50">
    <td className={tdClass}>
      <strong>{load.referenceNumber}</strong>
    </td>
    <td className={tdClass}>{load.carrierName ?? "—"}</td>
    <td className={tdClass}>{renderCurrency(load.brokerReceivable)}</td>
    <td className={tdClass}>{renderCurrency(load.brokerReceivedAmount)}</td>
    <td className={tdClass}>{renderDate(load.brokerReceivedDate)}</td>
    <td className={tdClass}>{renderCurrency(load.carrierPayable)}</td>
    <td className={tdClass}>{renderCurrency(load.carrierPaidAmount)}</td>
    <td className={tdClass}>{renderDate(load.carrierPaidDate)}</td>
    <td className={tdClass}>
      <PaymentStatusTag status={load.paymentStatus} />
    </td>
  </tr>
);

const UserGroupRow = ({ group }: { group: ExternalBillingUserGroup }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="cursor-pointer hover:bg-accent-50" onClick={() => setExpanded((x) => !x)}>
        <td className={`${tdClass} font-medium`} colSpan={2}>
          <span className="inline-flex items-center gap-1 text-default-700">
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            {group.userName}
          </span>
        </td>
        <td className={tdClass}>{renderCurrency(group.totalBrokerReceivable)}</td>
        <td className={tdClass}>{renderCurrency(group.totalBrokerReceived)}</td>
        <td className={tdClass} />
        <td className={tdClass}>{renderCurrency(group.totalCarrierPayable)}</td>
        <td className={tdClass}>{renderCurrency(group.totalCarrierPaid)}</td>
        <td className={tdClass} />
        <td className={tdClass}>{renderOwed(group.owedToBranch)}</td>
      </tr>
      {expanded && group.loads.map((l) => <LoadRow key={l.loadId} load={l} />)}
    </>
  );
};

const BranchRow = ({
  branch,
  onExpand,
  data,
  isExpanding,
}: {
  branch: ExternalBillingBranch;
  onExpand: (expanded: boolean, branchId: string) => Promise<void>;
  data: { userGroups: ExternalBillingUserGroup[] } | undefined;
  isExpanding: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) void onExpand(true, branch.branchId);
  };

  return (
    <>
      <tr
        className="cursor-pointer bg-default-50 hover:bg-default-100 font-semibold"
        onClick={toggle}
      >
        <td className={`${tdClass} font-bold`} colSpan={2}>
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
        <td className={tdClass}>{renderCurrency(branch.totalBrokerReceivable)}</td>
        <td className={tdClass}>{renderCurrency(branch.totalBrokerReceived)}</td>
        <td className={tdClass} />
        <td className={tdClass}>{renderCurrency(branch.totalCarrierPayable)}</td>
        <td className={tdClass}>{renderCurrency(branch.totalCarrierPaid)}</td>
        <td className={tdClass} />
        <td className={tdClass}>{renderOwed(branch.owedToBranch)}</td>
      </tr>
      {expanded && isExpanding && (
        <tr>
          <td colSpan={9} className="py-3 text-center">
            <Spinner size="sm" />
          </td>
        </tr>
      )}
      {expanded &&
        !isExpanding &&
        data?.userGroups.map((g) => <UserGroupRow key={g.userId ?? "unknown"} group={g} />)}
    </>
  );
};

export default function ExternalBillingTable() {
  const {
    activeFilter,
    activeQuery,
    apiParams,
    fields,
    handleFilterApply,
    setActiveFilter,
    setActiveQuery,
  } = useBillingFilters();
  const { onExpand, resetLoads, loadsByBranch, expandingBranchId } = useExpandedLoads(apiParams);

  const onFilterApply = (filter: AdvancedFilter | undefined, query: string | undefined) => {
    handleFilterApply(filter, query);
    resetLoads();
  };

  const { data: branches, isLoading } = useQuery({
    queryKey: ["billing-external", apiParams],
    queryFn: () => billingApi.listExternalByBranch(apiParams),
  });

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <h2 className="text-base font-semibold">External Billing</h2>
        <AdvancedFilterPopover
          fields={fields}
          initialFilter={activeFilter}
          initialQuery={activeQuery}
          onApply={onFilterApply}
        />
      </div>

      <ActiveFilterChips
        filter={activeFilter}
        fields={fields}
        query={activeQuery}
        onChange={setActiveFilter}
        onClearQuery={() => setActiveQuery("")}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={thClass}>Branch / User</th>
                <th className={thClass}>Carrier</th>
                <th className={thClass}>Broker Receivable</th>
                <th className={thClass}>Broker Received</th>
                <th className={thClass}>Broker Received Date</th>
                <th className={thClass}>Carrier Payable</th>
                <th className={thClass}>Carrier Paid</th>
                <th className={thClass}>Carrier Paid Date</th>
                <th className={thClass}>Owed / Status</th>
              </tr>
            </thead>
            <tbody>
              {(branches ?? []).map((branch) => (
                <BranchRow
                  key={branch.branchId}
                  branch={branch}
                  onExpand={onExpand}
                  data={loadsByBranch.get(branch.branchId)}
                  isExpanding={expandingBranchId === branch.branchId}
                />
              ))}
              {(branches ?? []).length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-sm text-default-500">
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
