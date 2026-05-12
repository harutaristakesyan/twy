import type React from "react";
import type { ReactNode } from "react";

type LabeledOptionProps = {
  label: ReactNode;
  description?: ReactNode;
};

export const LabeledOption: React.FC<LabeledOptionProps> = ({ label, description }) => {
  return (
    <>
      <div style={{ fontWeight: 500 }}>{label}</div>
      {description && <div style={{ fontSize: "12px", color: "#888" }}>{description}</div>}
    </>
  );
};
