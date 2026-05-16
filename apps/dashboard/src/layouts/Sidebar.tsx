import {
  BookOpen,
  Briefcase,
  Car,
  ChevronDown,
  ChevronRight,
  Gear,
  Persons,
  ShoppingBag,
} from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import type React from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import UserDropdown from "@/components/UserDropdown";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Resource } from "@/utils/permissions";

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
    icon: <Persons className="h-[18px] w-[18px]" />,
    label: "User Management",
    resources: ["users", "teams"],
    children: [
      { key: "/user-management/users", label: "Users", resources: ["users"] },
      { key: "/user-management/teams", label: "Teams", resources: ["teams"] },
    ],
  },
  {
    key: "/branches",
    icon: <Briefcase className="h-[18px] w-[18px]" />,
    label: "Branches",
    resources: ["branches"],
  },
  {
    key: "/loads",
    icon: <Car className="h-[18px] w-[18px]" />,
    label: "Loads",
    resources: ["loads"],
  },
  {
    key: "/outside-brokers",
    icon: <Persons className="h-[18px] w-[18px]" />,
    label: "Outside Brokers",
    resources: ["brokers", "brokers_requests"],
    children: [
      { key: "/outside-brokers/directory", label: "Directory", resources: ["brokers"] },
      { key: "/outside-brokers/requests", label: "Requests", resources: ["brokers_requests"] },
    ],
  },
  {
    key: "/carriers",
    icon: <ShoppingBag className="h-[18px] w-[18px]" />,
    label: "Carriers",
    resources: ["carriers_twy", "carriers_outside", "carriers_requests"],
    children: [
      { key: "/carriers/twy", label: "TWY Carriers", resources: ["carriers_twy"] },
      { key: "/carriers/outside", label: "Outside Carriers", resources: ["carriers_outside"] },
      { key: "/carriers/requests", label: "Requests", resources: ["carriers_requests"] },
    ],
  },
  {
    key: "/settings",
    icon: <Gear className="h-[18px] w-[18px]" />,
    label: "Settings",
    resources: ["settings"] as Resource[],
  },
  {
    key: "/accounting",
    icon: <BookOpen className="h-[18px] w-[18px]" />,
    label: "Accounting",
    resources: [
      "load_payment_order",
      "office_expense_payment_order",
      "external_billing",
      "internal_billing",
    ],
    children: [
      {
        key: "/accounting/payment-orders",
        label: "Payment Orders",
        resources: ["load_payment_order", "office_expense_payment_order"],
      },
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

const getSelectedKey = (pathname: string): string | undefined => {
  for (const item of allMenuItems) {
    if (item.children) {
      for (const child of item.children) {
        if (pathname === child.key || pathname.startsWith(`${child.key}/`)) return child.key;
      }
    } else if (pathname === item.key || pathname.startsWith(`${item.key}/`)) {
      return item.key;
    }
  }
  return undefined;
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [openKeys, setOpenKeys] = useState<Set<string>>(
    () => new Set(getParentKeys(location.pathname)),
  );
  const { permissions } = useCurrentUser();

  useEffect(() => {
    const parents = getParentKeys(location.pathname);
    setOpenKeys((prev) => {
      const next = new Set(prev);
      for (const k of parents) next.add(k);
      return next;
    });
  }, [location.pathname]);

  const selectedKey = getSelectedKey(location.pathname);

  const toggleGroup = (key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isActive = (key: string) => selectedKey === key;

  const visibleItems = allMenuItems.filter((item) => {
    if (item.children) {
      return item.children.some((c) => c.resources.some((r) => permissions[r]?.view));
    }
    return item.resources.some((r) => permissions[r]?.view);
  });

  return (
    <aside className="sticky top-0 flex h-screen w-60 flex-col overflow-y-auto bg-background">
      <div className="flex items-center justify-center py-4">
        <Logo />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2 pb-4">
        {visibleItems.map((item) => {
          if (item.children) {
            const visibleChildren = item.children.filter((c) =>
              c.resources.some((r) => permissions[r]?.view),
            );
            const isOpen = openKeys.has(item.key);
            return (
              <div key={item.key}>
                <Button
                  variant="ghost"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm"
                  onPress={() => toggleGroup(item.key)}
                >
                  <span className="flex items-center gap-2">
                    {item.icon}
                    {item.label}
                  </span>
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </Button>
                {isOpen && (
                  <div className="ml-4 flex flex-col gap-0.5 border-l border-default-200 pl-2">
                    {visibleChildren.map((child) => (
                      <Button
                        key={child.key}
                        variant={isActive(child.key) ? "secondary" : "ghost"}
                        className="w-full justify-start px-3 py-2 text-left text-sm"
                        onPress={() => navigate(child.key)}
                      >
                        {child.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Button
              key={item.key}
              variant={isActive(item.key) ? "secondary" : "ghost"}
              className="flex w-full items-center justify-start gap-2 px-3 py-2 text-left text-sm"
              onPress={() => navigate(item.key)}
            >
              {item.icon}
              {item.label}
            </Button>
          );
        })}
      </nav>

      <div className="m-5">
        <UserDropdown />
      </div>
    </aside>
  );
};

export default Sidebar;
