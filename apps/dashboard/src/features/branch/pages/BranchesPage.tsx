import type React from "react";
import BranchManagementTable from "@/features/branch/components/BranchManagementTable";
import { BranchModalProvider } from "../providers/BranchModalProvider";

const BranchesPage: React.FC = () => {
  return (
    <BranchModalProvider>
      <BranchManagementTable />
    </BranchModalProvider>
  );
};

export default BranchesPage;
