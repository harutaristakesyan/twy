import type React from "react";
import { Stepper } from "@/components/Stepper";
import type { LoadStatus } from "@/features/load/types/load";

const TruckGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 7h11v10H3z" />
    <path d="M14 10h4l3 3v4h-7z" />
    <circle cx="7" cy="18" r="1.5" />
    <circle cx="17" cy="18" r="1.5" />
  </svg>
);

const truckFractionByStatus: Record<LoadStatus, number> = {
  Pending: 0,
  Hold: 0,
  Declined: 0,
  Approved: 0.5,
  Delivered: 1,
};

const activeIndexByStatus: Record<LoadStatus, number> = {
  Pending: 0,
  Hold: 0,
  Declined: 0,
  Approved: 1,
  Delivered: 2,
};

export const LoadRouteVisualization: React.FC<{ status: LoadStatus }> = ({ status }) => (
  <div className="pt-7 pb-2">
    <Stepper
      steps={[{ key: "origin" }, { key: "destination" }]}
      activeIndex={activeIndexByStatus[status]}
      orientation="horizontal"
      color="default"
      pendingStyle="outline"
      size="sm"
      compact
      marker={{
        position: truckFractionByStatus[status],
        content: <TruckGlyph className="h-5 w-5 text-gray-900" />,
      }}
    />
  </div>
);
