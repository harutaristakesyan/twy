import { Spinner } from "@heroui/react";
import { useCallback, useState } from "react";
import { FileDownloadButton } from "@/features/files";
import { formatPercent, renderCurrency } from "@/utils/formatters";
import { billingApi } from "../api/billingApi";
import PaymentStatusTag from "../components/PaymentStatusTag";
import type { BillingInvoice, InternalBillingBranch, InternalBillingLoad } from "../types/billing";

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

interface ApiParams {
  query?: string;
  filters?: string;
  [key: string]: string | undefined;
}

export function useInternalExpandedLoads(apiParams: ApiParams) {
  const [loadsByBranch, setLoadsByBranch] = useState<Map<string, InternalBillingLoad[]>>(new Map());
  const [expandingBranchId, setExpandingBranchId] = useState<string | null>(null);

  const resetLoads = useCallback(() => setLoadsByBranch(new Map()), []);

  const onExpand = useCallback(
    async (expanded: boolean, record: InternalBillingBranch) => {
      if (!expanded || loadsByBranch.has(record.branchId)) return;
      setExpandingBranchId(record.branchId);
      try {
        const loads = await billingApi.listInternalLoads(record.branchId, apiParams);
        setLoadsByBranch((prev) => new Map(prev).set(record.branchId, loads));
      } finally {
        setExpandingBranchId(null);
      }
    },
    [apiParams, loadsByBranch],
  );

  const expandedRowRender = useCallback(
    (record: InternalBillingBranch) => {
      const loads = loadsByBranch.get(record.branchId) ?? [];
      if (expandingBranchId === record.branchId) {
        return (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        );
      }
      if (loads.length === 0) return <div className="py-2 text-sm text-gray-500">No loads</div>;
      return (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-1 px-2 text-left font-medium text-gray-600">Reference</th>
              <th className="py-1 px-2 text-left font-medium text-gray-600">Carrier</th>
              <th className="py-1 px-2 text-left font-medium text-gray-600">Service Fee</th>
              <th className="py-1 px-2 text-left font-medium text-gray-600">Income %</th>
              <th className="py-1 px-2 text-left font-medium text-gray-600">Charges</th>
              <th className="py-1 px-2 text-left font-medium text-gray-600">Profit</th>
              <th className="py-1 px-2 text-left font-medium text-gray-600">Status</th>
              <th className="py-1 px-2 text-left font-medium text-gray-600">Invoices</th>
            </tr>
          </thead>
          <tbody>
            {loads.map((load) => (
              <tr key={load.loadId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-1 px-2 font-medium">{load.referenceNumber}</td>
                <td className="py-1 px-2">{load.carrierName ?? "—"}</td>
                <td className="py-1 px-2">{renderCurrency(load.serviceFee)}</td>
                <td className="py-1 px-2">{formatPercent(load.incomePercentage)}</td>
                <td className="py-1 px-2">{renderCurrency(load.charges)}</td>
                <td className="py-1 px-2">{renderCurrency(load.profit)}</td>
                <td className="py-1 px-2">
                  <PaymentStatusTag status={load.paymentStatus} />
                </td>
                <td className="py-1 px-2">
                  <InvoicesCell invoices={load.invoices} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    },
    [loadsByBranch, expandingBranchId],
  );

  return { onExpand, expandedRowRender, resetLoads };
}
