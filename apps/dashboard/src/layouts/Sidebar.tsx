import {
  AccountBookOutlined,
  BranchesOutlined,
  CarOutlined,
  TeamOutlined,
  TruckOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import { Flex, Layout, Menu, type MenuProps, Typography } from "antd";
import type React from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
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

type ChildMenuItem = {
  key: string;
  label: string;
  resources: Resource[];
};

type FlatMenuItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
  resources: Resource[];
  children?: never;
};

type GroupMenuItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
  resources: Resource[];
  children: ChildMenuItem[];
};

type SidebarMenuItem = FlatMenuItem | GroupMenuItem;

const allMenuItems: SidebarMenuItem[] = [
  {
    key: "/user-management",
    icon: <UsergroupAddOutlined />,
    label: "User Management",
    resources: ["users", "teams"],
    children: [
      { key: "/user-management/users", label: "Users", resources: ["users"] },
      { key: "/user-management/teams", label: "Teams", resources: ["teams"] },
    ],
  },
  { key: "/branches", icon: <BranchesOutlined />, label: "Branches", resources: ["branches"] },
  { key: "/loads", icon: <TruckOutlined />, label: "Loads", resources: ["loads"] },
  {
    key: "/outside-brokers",
    icon: <TeamOutlined />,
    label: "Outside Brokers",
    resources: ["brokers", "brokers_requests"],
    children: [
      {
        key: "/outside-brokers/directory",
        label: "Directory",
        resources: ["brokers"],
      },
      {
        key: "/outside-brokers/requests",
        label: "Requests",
        resources: ["brokers_requests"],
      },
    ],
  },
  {
    key: "/carriers",
    icon: <CarOutlined />,
    label: "Carriers",
    resources: ["carriers_twy", "carriers_outside", "carriers_requests"],
    children: [
      {
        key: "/carriers/twy",
        label: "TWY Carriers",
        resources: ["carriers_twy"],
      },
      {
        key: "/carriers/outside",
        label: "Outside Carriers",
        resources: ["carriers_outside"],
      },
      {
        key: "/carriers/requests",
        label: "Requests",
        resources: ["carriers_requests"],
      },
    ],
  },
  {
    key: "/accounting",
    icon: <AccountBookOutlined />,
    label: "Accounting",
    resources: ["payment_orders", "external_billing", "internal_billing"],
    children: [
      { key: "/accounting/payment-orders", label: "Payment Orders", resources: ["payment_orders"] },
      {
        key: "/accounting/external-billing",
        label: "External Billing",
        resources: ["external_billing"],
      },
      {
        key: "/accounting/internal-billing",
        label: "Internal Billing",
        resources: ["internal_billing"],
      },
    ],
  },
];

const getParentKeys = (pathname: string): string[] => {
  const keys: string[] = [];
  for (const item of allMenuItems) {
    if (item.children) {
      const match = item.children.some(
        (c) => pathname === c.key || pathname.startsWith(`${c.key}/`),
      );
      if (match) keys.push(item.key);
    }
  }
  return keys;
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [openKeys, setOpenKeys] = useState<string[]>(() => getParentKeys(location.pathname));
  const { permissions } = useCurrentUser();

  useEffect(() => {
    const parents = getParentKeys(location.pathname);
    setOpenKeys((prev) => {
      const missing = parents.filter((k) => !prev.includes(k));
      return missing.length ? [...prev, ...missing] : prev;
    });
  }, [location.pathname]);

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const getSelectedKey = (): string | undefined => {
    for (const item of allMenuItems) {
      if (item.children) {
        for (const child of item.children) {
          if (location.pathname === child.key || location.pathname.startsWith(`${child.key}/`)) {
            return child.key;
          }
        }
      } else if (location.pathname === item.key || location.pathname.startsWith(`${item.key}/`)) {
        return item.key;
      }
    }
    return undefined;
  };

  const buildItems = (): MenuProps["items"] => {
    const result: MenuProps["items"] = [];

    for (const item of allMenuItems) {
      if (item.children) {
        const visibleChildren = item.children.filter((c) =>
          c.resources.some((r) => permissions[r]?.view),
        );
        if (visibleChildren.length === 0) continue;
        result.push({
          key: item.key,
          icon: item.icon,
          label: item.label,
          children: visibleChildren.map(({ key, label }) => ({ key, label })),
        });
      } else {
        if (!item.resources.some((r) => permissions[r]?.view)) continue;
        result.push({ key: item.key, icon: item.icon, label: item.label });
      }
    }

    return result;
  };

  const selectedKey = getSelectedKey();

  return (
    <Sider style={siderStyle} theme="light" width={240}>
      <Flex justify="center" align="center" style={{ padding: 15 }}>
        <Title style={{ margin: 0 }}>TWY</Title>
      </Flex>

      <Menu
        mode="inline"
        style={{ borderInlineEnd: "none" }}
        selectedKeys={selectedKey ? [selectedKey] : []}
        openKeys={openKeys}
        onOpenChange={setOpenKeys}
        items={buildItems()}
        onClick={handleMenuClick}
      />
    </Sider>
  );
};

export default Sidebar;
