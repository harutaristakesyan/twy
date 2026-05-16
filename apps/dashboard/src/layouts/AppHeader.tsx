import type React from "react";
import { useLocation } from "react-router-dom";
import UserDropdown from "@/components/UserDropdown";
import { navigationLabelMap } from "@/config/navigationMap";

const AppHeader: React.FC = () => {
  const location = useLocation();
  const label = navigationLabelMap[location.pathname];

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-default-200 bg-background px-4 py-3">
      <h1 className="text-lg font-semibold">{label}</h1>
      <UserDropdown />
    </header>
  );
};

export default AppHeader;
