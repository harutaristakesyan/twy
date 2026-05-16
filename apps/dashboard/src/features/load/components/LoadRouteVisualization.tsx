import type React from "react";
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

const truckPercentByStatus: Record<LoadStatus, number> = {
  Pending: 0,
  Hold: 0,
  Declined: 0,
  Approved: 50,
  Delivered: 100,
};

const trackColorByStatus: Record<LoadStatus, string> = {
  Pending: "bg-default-300",
  Hold: "bg-default-300",
  Declined: "bg-default-300",
  Approved: "bg-default-900",
  Delivered: "bg-default-900",
};

export const LoadRouteVisualization: React.FC<{ status: LoadStatus }> = ({ status }) => {
  const truckPercent = truckPercentByStatus[status];
  const isDelivered = status === "Delivered";
  return (
    <div className="relative flex items-center py-2">
      <span className="h-2 w-2 rounded-full bg-default-900" />
      <div className="relative flex-1">
        <div className={`h-0.5 w-full ${trackColorByStatus[status]}`} />
        <span className="absolute -top-2.5 -translate-x-1/2" style={{ left: `${truckPercent}%` }}>
          <TruckGlyph className="h-5 w-5 text-default-900" />
        </span>
      </div>
      <span
        className={`h-2 w-2 rounded-full ${
          isDelivered ? "bg-default-900" : "border border-default-400 bg-white"
        }`}
      />
    </div>
  );
};
