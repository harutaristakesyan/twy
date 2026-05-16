import type React from "react";
import type { Load, LoadStatus, Location } from "@/features/load/types/load";

type Step = {
  key: string;
  label: string;
  address: string;
  filled: boolean;
};

const isTransitDone = (status: LoadStatus): boolean =>
  status === "Approved" || status === "Delivered";

const buildSteps = (load: Load): Step[] => {
  const filledPickup = load.status !== "Pending" && load.status !== "Hold";
  const filledDelivered = load.status === "Delivered";

  const pickupSteps: Step[] = load.pickups.map((p: Location, idx) => ({
    key: `pu-${idx}`,
    label: idx === 0 ? "Pick up" : `Pick up ${idx + 1}`,
    address: p.address,
    filled: filledPickup,
  }));

  const transitStep: Step = {
    key: "transit",
    label: "On the way",
    address:
      load.pickups[load.pickups.length - 1]?.address && load.dropoffs[0]?.address
        ? `${load.pickups[load.pickups.length - 1].address} → ${load.dropoffs[0].address}`
        : "",
    filled: isTransitDone(load.status),
  };

  const dropoffSteps: Step[] = load.dropoffs.map((d: Location, idx) => ({
    key: `do-${idx}`,
    label: idx === load.dropoffs.length - 1 ? "Delivered" : `Drop-off ${idx + 1}`,
    address: d.address,
    filled: filledDelivered && idx === load.dropoffs.length - 1,
  }));

  return [...pickupSteps, transitStep, ...dropoffSteps];
};

export const LoadDetailTrackingTab: React.FC<{ load: Load }> = ({ load }) => {
  const steps = buildSteps(load);
  return (
    <ol className="flex flex-col">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`mt-1.5 h-3 w-3 rounded-full ${
                  step.filled ? "bg-default-900" : "border border-default-400 bg-white"
                }`}
              />
              {!isLast && (
                <span
                  className={`flex-1 w-0.5 ${
                    step.filled ? "bg-default-900" : "border-l border-dashed border-default-400"
                  }`}
                />
              )}
            </div>
            <div className="flex-1 pb-5">
              <p className="text-sm font-semibold">{step.label}</p>
              {step.address && <p className="mt-0.5 text-xs text-default-500">{step.address}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
