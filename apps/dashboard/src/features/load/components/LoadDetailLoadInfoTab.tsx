import { Button } from "@heroui/react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import { LoadStatusChip } from "@/features/load/components/LoadStatusChip";
import type { Load } from "@/features/load/types/load";

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 py-2">
    <span className="text-xs uppercase tracking-wide text-default-500">{label}</span>
    <span className="max-w-[60%] text-right text-sm font-medium">{value || "—"}</span>
  </div>
);

const formatMoney = (n: number | null | undefined): string =>
  n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export const LoadDetailLoadInfoTab: React.FC<{ load: Load }> = ({ load }) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between pb-2">
        <LoadStatusChip status={load.status} size="md" />
        <Button size="sm" variant="secondary" onPress={() => navigate(`/loads/${load.id}/status`)}>
          Change status
        </Button>
      </div>
      <div className="divide-y divide-default-100">
        <Row label="Reference" value={`#${load.referenceNumber}`} />
        <Row label="Broker" value={load.broker.brokerName} />
        <Row label="Carrier" value={load.carrier?.carrierName ?? null} />
        <Row label="Customer rate" value={formatMoney(load.customerRate ?? null)} />
        <Row label="Carrier rate" value={formatMoney(load.carrierRate ?? null)} />
        <Row label="Branch" value={load.branchName} />
        <Row label="Commodity" value={load.commodity} />
        <Row label="Load type" value={load.loadType} />
        <Row label="Service type" value={load.serviceType} />
        <Row label="Weight" value={load.weight} />
        <Row label="Temperature" value={load.temperature ?? null} />
      </div>
    </div>
  );
};
