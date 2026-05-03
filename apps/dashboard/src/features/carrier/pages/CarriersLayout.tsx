import { Tabs } from "antd";
import type React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { CarrierModalProvider } from "../providers/CarrierModalProvider";

const tabItems = [
  { key: "twy", label: "Twy" },
  { key: "outside", label: "Outside" },
  { key: "requests", label: "Requests" },
];

const CarriersLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeKey = location.pathname.split("/")[2] ?? "twy";

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
