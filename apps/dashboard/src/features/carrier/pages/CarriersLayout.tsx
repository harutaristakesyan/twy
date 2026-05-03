import { Tabs } from "antd";
import type React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { CarrierModalProvider } from "../providers/CarrierModalProvider";

const CarriersLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { permissions } = useCurrentUser();
  const activeKey = location.pathname.split("/")[2] ?? "twy";

  const tabItems = [
    permissions.carriers_twy?.view && { key: "twy", label: "Twy" },
    permissions.carriers_outside?.view && { key: "outside", label: "Outside" },
    permissions.carriers_requests?.view && { key: "requests", label: "Requests" },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <CarrierModalProvider>
      <Tabs
        activeKey={activeKey}
        items={tabItems}
        onChange={(key) => navigate(`/carriers/${key}`)}
        style={{ marginBottom: 0 }}
      />
      <Outlet />
    </CarrierModalProvider>
  );
};

export default CarriersLayout;
