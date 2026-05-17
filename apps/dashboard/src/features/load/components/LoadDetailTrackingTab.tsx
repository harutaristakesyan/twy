import type React from "react";
import { Stepper, type StepperStep } from "@/components/Stepper";
import type { Load, LoadStatus, Location } from "@/features/load/types/load";

const activeStepIndex = (
  status: LoadStatus,
  pickupsCount: number,
  dropoffsCount: number,
): number => {
  switch (status) {
    case "Pending":
    case "Hold":
    case "Declined":
      return 0;
    case "Approved":
      return pickupsCount;
    case "Delivered":
      return pickupsCount + 1 + dropoffsCount;
  }
};

const buildSteps = (load: Load): StepperStep[] => {
  const pickupSteps: StepperStep[] = load.pickups.map((p: Location, idx) => ({
    key: `pu-${idx}`,
    label: idx === 0 ? "Pick up" : `Pick up ${idx + 1}`,
    description: p.address,
    meta: p.cityZipCode ?? undefined,
  }));

  const lastPickup = load.pickups[load.pickups.length - 1];
  const firstDropoff = load.dropoffs[0];

  const transitStep: StepperStep = {
    key: "transit",
    label: "On the way",
    description:
      lastPickup?.address && firstDropoff?.address
        ? `${lastPickup.address} → ${firstDropoff.address}`
        : undefined,
  };

  const dropoffSteps: StepperStep[] = load.dropoffs.map((d: Location, idx) => ({
    key: `do-${idx}`,
    label: idx === load.dropoffs.length - 1 ? "Delivered" : `Drop-off ${idx + 1}`,
    description: d.address,
    meta: d.cityZipCode ?? undefined,
  }));

  return [...pickupSteps, transitStep, ...dropoffSteps];
};

export const LoadDetailTrackingTab: React.FC<{ load: Load }> = ({ load }) => {
  const steps = buildSteps(load);
  const activeIndex = activeStepIndex(load.status, load.pickups.length, load.dropoffs.length);

  return (
    <Stepper
      steps={steps}
      activeIndex={activeIndex}
      orientation="vertical"
      color="primary"
      pendingStyle="solid"
      size="md"
    />
  );
};
