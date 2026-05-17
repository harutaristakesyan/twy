import type { Selection } from "@heroui/react";
import { useState } from "react";
import type { ColumnDef } from "@/components/DataTable";
import { ExpandableDataTable } from "@/components/DataTable";
import type { Filter } from "@/components/Search";
import { ActiveFilters, Search } from "@/components/Search";
import { queryKeys, useApiQuery } from "@/libs/query";
import { formatCurrency, renderCurrency } from "@/utils/formatters";
import { billingApi } from "../api/billingApi";
import PaymentStatusTag from "../components/PaymentStatusTag";
import type { ExternalBillingUserGroup } from "../hooks/groupLoadsByCreator";
import { useBillingFilters } from "../hooks/useBillingFilters";
import { useExpandedLoads } from "../hooks/useExpandedLoads";
import type { ExternalBillingBranch, ExternalBillingLoad } from "../types/billing";

const renderDate = (v: string | null | undefined) =>
  v
    ? new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "—";

const renderOwed = (v: number) => (
  <span className={`font-semibold ${v > 0 ? "text-danger" : "text-success"}`}>
    {formatCurrency(v)}
  </span>
);

type BranchRow = {
  kind: "branch";
  id: string;
  branch: ExternalBillingBranch;
  children: ExternalRow[];
};

type UserGroupRow = {
  kind: "userGroup";
  id: string;
  group: ExternalBillingUserGroup;
  children: LoadRow[];
};

type LoadRow = {
  kind: "load";
  id: string;
  load: ExternalBillingLoad;
  children: [];
};

type PlaceholderRow = {
  kind: "placeholder";
  id: string;
  children: [];
};

type ExternalRow = BranchRow | UserGroupRow | LoadRow | PlaceholderRow;

const COLUMNS: ColumnDef[] = [
  { id: "name", label: "Branch / User", isRowHeader: true },
  { id: "carrier", label: "Carrier" },
  { id: "brokerReceivable", label: "Broker Receivable" },
  { id: "brokerReceived", label: "Broker Received" },
  { id: "brokerReceivedDate", label: "Broker Received Date" },
  { id: "carrierPayable", label: "Carrier Payable" },
  { id: "carrierPaid", label: "Carrier Paid" },
  { id: "carrierPaidDate", label: "Carrier Paid Date" },
  { id: "status", label: "Owed / Status" },
];

function renderBranchCell(branch: ExternalBillingBranch, colId: string) {
  switch (colId) {
    case "name":
      return (
        <span className="font-bold">
          {branch.branchName}
          <span className="ml-1 text-xs font-normal text-default-500">
            ({branch.loadCount} loads)
          </span>
        </span>
      );
    case "brokerReceivable":
      return renderCurrency(branch.totalBrokerReceivable);
    case "brokerReceived":
      return renderCurrency(branch.totalBrokerReceived);
    case "carrierPayable":
      return renderCurrency(branch.totalCarrierPayable);
    case "carrierPaid":
      return renderCurrency(branch.totalCarrierPaid);
    case "status":
      return renderOwed(branch.owedToBranch);
    default:
      return null;
  }
}

function renderUserGroupCell(group: ExternalBillingUserGroup, colId: string) {
  switch (colId) {
    case "name":
      return <span className="font-medium text-default-700">{group.userName}</span>;
    case "brokerReceivable":
      return renderCurrency(group.totalBrokerReceivable);
    case "brokerReceived":
      return renderCurrency(group.totalBrokerReceived);
    case "carrierPayable":
      return renderCurrency(group.totalCarrierPayable);
    case "carrierPaid":
      return renderCurrency(group.totalCarrierPaid);
    case "status":
      return renderOwed(group.owedToBranch);
    default:
      return null;
  }
}

function renderLoadCell(load: ExternalBillingLoad, colId: string) {
  switch (colId) {
    case "name":
      return <strong>{load.referenceNumber}</strong>;
    case "carrier":
      return load.carrierName ?? "—";
    case "brokerReceivable":
      return renderCurrency(load.brokerReceivable);
    case "brokerReceived":
      return renderCurrency(load.brokerReceivedAmount);
    case "brokerReceivedDate":
      return renderDate(load.brokerReceivedDate);
    case "carrierPayable":
      return renderCurrency(load.carrierPayable);
    case "carrierPaid":
      return renderCurrency(load.carrierPaidAmount);
    case "carrierPaidDate":
      return renderDate(load.carrierPaidDate);
    case "status":
      return <PaymentStatusTag status={load.paymentStatus} />;
    default:
      return null;
  }
}

function renderCell(row: ExternalRow, colId: string) {
  switch (row.kind) {
    case "branch":
      return renderBranchCell(row.branch, colId);
    case "userGroup":
      return renderUserGroupCell(row.group, colId);
    case "load":
      return renderLoadCell(row.load, colId);
    case "placeholder":
      return colId === "name" ? (
        <span className="text-sm italic text-default-500">Loading…</span>
      ) : null;
  }
}

const getId = (row: ExternalRow) => row.id;
const getChildren = (row: ExternalRow): ExternalRow[] => row.children as ExternalRow[];

export default function ExternalBillingPage() {
  const { activeFilter, activeQuery, apiParams, fields, setActiveFilter, setActiveQuery } =
    useBillingFilters();
  const { onExpand, resetLoads, loadsByBranch } = useExpandedLoads(apiParams);

  const [expandedKeys, setExpandedKeys] = useState<Selection>(new Set());

  const handleQueryChange = (q: string) => {
    setActiveQuery(q);
    resetLoads();
    setExpandedKeys(new Set());
  };

  const handleFilterChange = (filter: Filter | undefined) => {
    setActiveFilter(filter);
    resetLoads();
    setExpandedKeys(new Set());
  };

  const handleExpandedChange = (keys: Selection) => {
    setExpandedKeys(keys);
    if (keys === "all") return;
    for (const key of keys) {
      const keyStr = String(key);
      if (keyStr.startsWith("branch-")) {
        void onExpand(true, keyStr.slice("branch-".length));
      }
    }
  };

  const { data: branches, isLoading } = useApiQuery(queryKeys.billing.external(apiParams), () =>
    billingApi.listExternalByBranch(apiParams),
  );

  const tree: ExternalRow[] = (branches ?? []).map((branch): BranchRow => {
    const cached = loadsByBranch.get(branch.branchId);
    const children: (UserGroupRow | PlaceholderRow)[] = cached
      ? cached.userGroups.map(
          (group): UserGroupRow => ({
            kind: "userGroup",
            id: `ug-${group.userId ?? "unknown"}-${branch.branchId}`,
            group,
            children: group.loads.map(
              (load): LoadRow => ({
                kind: "load",
                id: `load-${load.loadId}`,
                load,
                children: [],
              }),
            ),
          }),
        )
      : [
          {
            kind: "placeholder",
            id: `loading-${branch.branchId}`,
            children: [],
          },
        ];
    return {
      kind: "branch",
      id: `branch-${branch.branchId}`,
      branch,
      children,
    };
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-base font-semibold">External Billing</h2>
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

      <ExpandableDataTable
        ariaLabel="External billing"
        items={tree}
        columns={COLUMNS}
        treeColumn="name"
        getId={getId}
        getChildren={getChildren}
        renderCell={renderCell}
        isLoading={isLoading}
        expandedKeys={expandedKeys}
        onExpandedChange={handleExpandedChange}
      />
    </div>
  );
}
