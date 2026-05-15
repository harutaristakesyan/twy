import type { ChargeSide } from "@twy/db";
import { Tag } from "antd";

interface ChargeSideTagProps {
  value: ChargeSide | null | undefined;
}

const ChargeSideTag = ({ value }: ChargeSideTagProps) => {
  if (!value) return "—";
  return (
    <Tag color={value === "broker" ? "blue" : "purple"}>
      {value === "broker" ? "Broker Side" : "Carrier Side"}
    </Tag>
  );
};

export default ChargeSideTag;
