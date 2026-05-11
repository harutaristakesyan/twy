import type React from "react";
import type { ReactNode } from "react";

type SelectOptionProps = {
  label: ReactNode;
  description?: ReactNode;
};

export const SelectOption: React.FC<SelectOptionProps> = ({ label, description }) => {
  return (
    <>
      <div style={{ fontWeight: 500 }}>{label}</div>
      {description && <div style={{ fontSize: "12px", color: "#888" }}>{description}</div>}
    </>
  );
};
