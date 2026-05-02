import { Tag } from "antd";
import type React from "react";
import { useMockData } from "@/shared/hooks/useMockData";

/**
 * Development Mode Indicator
 * Shows a badge when mock APIs are enabled
 * Only visible in development mode
 */
const DevModeIndicator: React.FC = () => {
  const { isEnabled } = useMockData();

  // Don't show anything if mocks are disabled
  if (!isEnabled) {
    return null;
  }

  return (
    <Tag
      color="orange"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9999,
        fontSize: "12px",
        padding: "4px 12px",
        borderRadius: "4px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        userSelect: "none",
      }}
    >
      🎭 MOCK MODE
    </Tag>
  );
};

export default DevModeIndicator;
