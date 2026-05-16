import type React from "react";
import CIManagementPage from "@/features/community-license/pages/CIManagementPage";

const SettingsPage: React.FC = () => (
  <div className="flex flex-col gap-4">
    <div className="flex gap-2 border-b border-gray-200">
      <span className="px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary">
        Community Licenses
      </span>
    </div>
    <CIManagementPage />
  </div>
);

export default SettingsPage;
