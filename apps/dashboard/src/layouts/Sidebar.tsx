import {
  BranchesOutlined,
  CarOutlined,
  LineChartOutlined,
  TeamOutlined,
  TruckOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import { Flex, Layout, Menu, type MenuProps, Typography } from "antd";
import type React from "react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { EventType, useEvent } from "@/libs/EventBus.ts";
import type { Resource } from "@/utils/permissions";

const { Sider } = Layout;
const { Title } = Typography;

const siderStyle: React.CSSProperties = {
  overflow: "auto",
  height: "100vh",
  position: "sticky",
  insetInlineStart: 0,
  top: 0,
  bottom: 0,
  scrollbarWidth: "thin",
  scrollbarGutter: "stable",
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { permissions } = useCurrentUser();

  useEvent(EventType.SidebarCollapsed, (payload) => setCollapsed(payload));

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const allMenuItems: Array<{
    key: string;
    icon: React.ReactNode;
    label: string;
    resources: Resource[];
  }> = [
    { key: "/", icon: <LineChartOutlined />, label: "Users", resources: ["users"] },
    { key: "/branches", icon: <BranchesOutlined />, label: "Branches", resources: ["branches"] },
    { key: "/loads", icon: <TruckOutlined />, label: "Loads", resources: ["loads"] },
    {
      key: "/outside-brokers",
      icon: <TeamOutlined />,
      label: "Outside Brokers",
      resources: ["brokers", "brokers_requests"],
    },
    {
      key: "/carriers",
      icon: <CarOutlined />,
      label: "Carriers",
      resources: ["carriers_twy", "carriers_outside", "carriers_requests"],
    },
    { key: "/teams", icon: <UserSwitchOutlined />, label: "Teams", resources: ["teams"] },
  ];

  const filteredItems = allMenuItems.filter((item) =>
    item.resources.some((r) => permissions[r]?.view),
  );

  const selectedKey = filteredItems.find(
    (item) => location.pathname === item.key || location.pathname.startsWith(`${item.key}/`),
  )?.key;

  const items: MenuProps["items"] = filteredItems.map(({ key, icon, label }) => ({
    key,
    icon,
    label,
  }));

  return (
    <Sider
      style={siderStyle}
      trigger={null}
      collapsible
      collapsed={collapsed}
      theme="light"
      width={240}
      breakpoint="md"
    >
      {!collapsed && (
        <Flex vertical justify="center" style={{ padding: 15 }}>
          <Title>TWY</Title>
        </Flex>
      )}

      <Menu
        mode="inline"
        style={{ borderInlineEnd: "none" }}
        selectedKeys={selectedKey ? [selectedKey] : []}
        items={items}
        onClick={handleMenuClick}
      />
    </Sider>
  );
};

export default Sidebar;
