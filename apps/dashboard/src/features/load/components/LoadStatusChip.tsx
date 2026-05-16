import { Chip } from "@heroui/react";
import type React from "react";
import type { LoadStatus } from "@/features/load/types/load";

type ChipColor = "default" | "accent" | "success" | "warning" | "danger";

const STATUS_COLOR: Record<LoadStatus, ChipColor> = {
  Pending: "warning",
  Approved: "accent",
  Delivered: "success",
  Hold: "default",
  Declined: "danger",
};

export const LoadStatusChip: React.FC<{ status: LoadStatus; size?: "sm" | "md" }> = ({
  status,
  size = "sm",
}) => (
  <Chip color={STATUS_COLOR[status]} variant="soft" size={size}>
    {status}
  </Chip>
);
