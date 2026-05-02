import type React from "react";
import { LoadManagementTable } from "@/features/load/components/LoadManagementTable";
import { LoadModalProvider } from "../providers/LoadModalProvider";

const LoadsPage: React.FC = () => {
  return (
    <LoadModalProvider>
      <LoadManagementTable />
    </LoadModalProvider>
  );
};

export default LoadsPage;
