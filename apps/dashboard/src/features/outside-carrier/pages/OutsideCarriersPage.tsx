import type React from "react";
import OutsideCarriersManagementTable from "@/features/outside-carrier/components/OutsideCarriersManagementTable";
import { OutsideCarrierModalProvider } from "../providers/OutsideCarrierModalProvider";

const OutsideCarriersPage: React.FC = () => {
  return (
    <OutsideCarrierModalProvider>
      <OutsideCarriersManagementTable />
    </OutsideCarrierModalProvider>
  );
};

export default OutsideCarriersPage;
