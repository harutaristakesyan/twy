import { Box } from "@gravity-ui/icons";
import type React from "react";
import { LoadCustomerRow } from "@/features/load/components/LoadCustomerRow";
import { LoadRouteVisualization } from "@/features/load/components/LoadRouteVisualization";
import { LoadStatusChip } from "@/features/load/components/LoadStatusChip";
import type { Load } from "@/features/load/types/load";

const formatAddress = (addr: string | undefined): string =>
  addr ? addr.replace(/\s+/g, " ").trim() : "—";

export const LoadCard: React.FC<{ load: Load; isSelected?: boolean }> = ({ load, isSelected }) => {
  const firstPickup = load.pickups[0]?.address;
  const lastDropoff = load.dropoffs[load.dropoffs.length - 1]?.address;

  return (
    <div
      className={`flex w-full flex-col gap-3 rounded-xl border p-4 transition-colors ${
        isSelected
          ? "border-primary bg-primary-50"
          : "border-default-200 bg-white hover:border-default-300"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-default-100">
            <Box className="h-4 w-4 text-default-700" />
          </span>
          <span className="font-semibold">#{load.referenceNumber}</span>
        </div>
        <LoadStatusChip status={load.status} />
      </div>

      <LoadRouteVisualization status={load.status} />

      <div className="grid grid-cols-2 gap-2 text-xs text-default-600">
        <p className="truncate">{formatAddress(firstPickup)}</p>
        <p className="truncate text-right">{formatAddress(lastDropoff)}</p>
      </div>

      <div className="border-t border-default-100 pt-3">
        <LoadCustomerRow broker={load.broker} />
      </div>
    </div>
  );
};
