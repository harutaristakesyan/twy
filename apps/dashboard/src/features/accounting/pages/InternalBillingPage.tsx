import type { Selection } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { ColumnDef } from "@/components/DataTable";
import { ExpandableDataTable } from "@/components/DataTable";
import type { Filter } from "@/components/Search";
import { ActiveFilters, Search } from "@/components/Search";
import { FileDownloadButton } from "@/features/files";
import { formatCurrency, formatPercent, renderCurrency } from "@/utils/formatters";
import { billingApi } from "../api/billingApi";
import PaymentStatusTag from "../components/PaymentStatusTag";
import { useBillingFilters } from "../hooks/useBillingFilters";
import { useInternalExpandedLoads } from "../hooks/useInternalExpandedLoads";
import type { BillingInvoice, InternalBillingBranch, InternalBillingLoad } from "../types/billing";

type BranchRow = {
  kind: "branch";
  id: string;
  branch: InternalBillingBranch;
  children: (LoadRow | PlaceholderRow)[];
};

type LoadRow = {
  kind: "load";
  id: string;
  load: InternalBillingLoad;
  children: [];
};

type PlaceholderRow = {
  kind: "placeholder";
  id: string;
  children: [];
};

type InternalRow = BranchRow | LoadRow | PlaceholderRow;

const COLUMNS: ColumnDef[] = [
  { id: "name", label: "Branch / Reference", isRowHeader: true },
  { id: "carrier", label: "Carrier" },
  { id: "serviceFee", label: "Total Service Fee" },
  { id: "incomePercent", label: "Income %" },
  { id: "charges", label: "Total Charges" },
  { id: "profit", label: "Total Profit" },
  { id: "status", label: "Status" },
  { id: "invoices", label: "Invoices" },
];

const InvoicesCell = ({ invoices }: { invoices: BillingInvoice[] }) => {
  if (invoices.length === 0) return <span>—</span>;
  return (
    <div className="flex flex-col gap-1">
      {invoices.map((inv) => (
        <FileDownloadButton key={inv.fileId} fileId={inv.fileId} fileName={inv.fileName} />
      ))}
    </div>
  );
};

function renderBranchCell(branch: InternalBillingBranch, colId: string) {
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
    case "serviceFee":
      return renderCurrency(branch.totalServiceFee);
    case "charges":
      return renderCurrency(branch.totalCharges);
    case "incomePercent":
      return formatPercent(branch.avgIncomePercentage);
    case "profit":
      return (
        <span
          className={`font-semibold ${branch.totalProfit >= 0 ? "text-success" : "text-danger"}`}
        >
          {formatCurrency(branch.totalProfit)}
        </span>
      );
    default:
      return null;
  }
}

function renderLoadCell(load: InternalBillingLoad, colId: string) {
  switch (colId) {
    case "name":
      return <strong>{load.referenceNumber}</strong>;
    case "carrier":
      return load.carrierName ?? "—";
    case "serviceFee":
      return renderCurrency(load.serviceFee);
    case "incomePercent":
      return formatPercent(load.incomePercentage);
    case "charges":
      return renderCurrency(load.charges);
    case "profit":
      return renderCurrency(load.profit);
    case "status":
      return <PaymentStatusTag status={load.paymentStatus} />;
    case "invoices":
      return <InvoicesCell invoices={load.invoices} />;
    default:
      return null;
  }
}

function renderCell(row: InternalRow, colId: string) {
  switch (row.kind) {
    case "branch":
      return renderBranchCell(row.branch, colId);
    case "load":
      return renderLoadCell(row.load, colId);
    case "placeholder":
      return colId === "name" ? (
        <span className="text-sm italic text-default-500">Loading…</span>
      ) : null;
  }
}

const getId = (row: InternalRow) => row.id;
const getChildren = (row: InternalRow): InternalRow[] => row.children as InternalRow[];

export default function InternalBillingPage() {
  const { activeFilter, activeQuery, apiParams, fields, setActiveFilter, setActiveQuery } =
    useBillingFilters();
  const { onExpand, resetLoads, loadsByBranch } = useInternalExpandedLoads(apiParams);

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

  const { data: branchesData, isLoading } = useQuery({
    queryKey: ["billing-internal", apiParams],
    queryFn: () => billingApi.listInternalByBranch(apiParams),
  });

  const handleExpandedChange = (keys: Selection) => {
    setExpandedKeys(keys);
    if (keys === "all") return;
    for (const key of keys) {
      const branchId = String(key).replace(/^branch-/, "");
      const branch = (branchesData ?? []).find((b) => b.branchId === branchId);
      if (branch) void onExpand(true, branch);
    }
  };

  const tree: InternalRow[] = (branchesData ?? []).map((branch): BranchRow => {
    const loads = loadsByBranch.get(branch.branchId);
    const children: (LoadRow | PlaceholderRow)[] = loads
      ? loads.map(
          (load): LoadRow => ({
            kind: "load",
            id: `load-${load.loadId}`,
            load,
            children: [],
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

      <ExpandableDataTable
        ariaLabel="Internal billing"
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
