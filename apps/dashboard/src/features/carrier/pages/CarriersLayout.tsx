import type React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const CarriersLayout: React.FC = () => {
  const { permissions } = useCurrentUser();

  const tabs = [
    { to: "twy", label: "TWY", show: Boolean(permissions.carriers_twy?.view) },
    { to: "outside", label: "Outside", show: Boolean(permissions.carriers_outside?.view) },
    { to: "requests", label: "Requests", show: Boolean(permissions.carriers_requests?.view) },
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

export default CarriersLayout;
