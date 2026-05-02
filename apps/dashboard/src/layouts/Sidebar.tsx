import {
  BranchesOutlined,
  CarOutlined,
  LineChartOutlined,
  TeamOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import { Flex, Layout, Menu, type MenuProps, Typography } from "antd";
import type React from "react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { EventType, useEvent } from "@/libs/EventBus.ts";
import { MenuFeature } from "@/utils/permissions";

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

  const allMenuItems: MenuProps["items"] = [
    { key: "/", icon: <LineChartOutlined />, label: "Users" },
    { key: "/branches", icon: <BranchesOutlined />, label: "Branches" },
    { key: "/loads", icon: <TruckOutlined />, label: "Loads" },
    { key: "/outside-brokers", icon: <TeamOutlined />, label: "OutSide Brokers" },
    { key: "/outside-carriers", icon: <CarOutlined />, label: "OutSide Carriers" },
  ];

  const menuPermissionMap: Record<string, MenuFeature> = {
    "/": MenuFeature.USERS,
    "/branches": MenuFeature.BRANCHES,
    "/loads": MenuFeature.LOADS,
    "/outside-brokers": MenuFeature.OUTSIDE_BROKERS,
    "/outside-carriers": MenuFeature.OUTSIDE_CARRIERS,
  };

  const items: MenuProps["items"] = allMenuItems.filter(
    (item) => item?.key && permissions.menu[menuPermissionMap[item.key as string]],
  );

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
        selectedKeys={[location.pathname]}
        items={items}
        onClick={handleMenuClick}
      />
    </Sider>
  );
};

export default Sidebar;
