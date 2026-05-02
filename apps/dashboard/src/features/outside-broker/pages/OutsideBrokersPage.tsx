import type React from "react";
import OutsideBrokersManagementTable from "@/features/outside-broker/components/OutsideBrokersManagementTable";
import { OutsideBrokerModalProvider } from "../providers/OutsideBrokerModalProvider";

const OutsideBrokersPage: React.FC = () => {
  return (
    <OutsideBrokerModalProvider>
      <OutsideBrokersManagementTable />
    </OutsideBrokerModalProvider>
  );
};

export default OutsideBrokersPage;
