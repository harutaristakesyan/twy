import { Tabs } from "antd";
import type React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canViewBrokerRequests } from "@/utils/permissions";
import { OutsideBrokerModalProvider } from "../providers/OutsideBrokerModalProvider";

const OutsideBrokersLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { permissions } = useCurrentUser();
  const activeKey = location.pathname.split("/")[2] ?? "directory";

  const tabItems = [
    permissions.brokers?.view && { key: "directory", label: "Outside brokers" },
    canViewBrokerRequests(permissions) && { key: "requests", label: "Requests" },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <OutsideBrokerModalProvider>
      <Tabs
        activeKey={activeKey}
        items={tabItems}
        onChange={(key) => navigate(`/outside-brokers/${key}`)}
        style={{ marginBottom: 0 }}
      />
      <Outlet />
    </OutsideBrokerModalProvider>
  );
};

export default OutsideBrokersLayout;
