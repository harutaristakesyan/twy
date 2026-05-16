import type React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canViewBrokerRequests } from "@/utils/permissions";

const OutsideBrokersLayout: React.FC = () => {
  const { permissions } = useCurrentUser();

  const tabs = [
    { to: "directory", label: "Directory", show: Boolean(permissions.brokers?.view) },
    { to: "requests", label: "Requests", show: canViewBrokerRequests(permissions) },
  ].filter((t) => t.show);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
};

export default OutsideBrokersLayout;
