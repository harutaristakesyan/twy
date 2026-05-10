import { Flex, Layout, Typography } from "antd";
import type React from "react";
import { useLocation } from "react-router-dom";
import UserDropdown from "@/components/UserDropdown.tsx";
import { navigationLabelMap } from "@/config/navigationMap.ts";

const { Header } = Layout;
const { Title } = Typography;

const AppHeader: React.FC = () => {
  const location = useLocation();
  const label = navigationLabelMap[location.pathname];

  return (
    <Header
      style={{
        position: "sticky",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 16px",
        rowGap: 10,
        top: 0,
        zIndex: 1,
      }}
    >
      <Flex align="center" gap={20}>
        <Title level={4} style={{ margin: 0 }}>
          {label}
        </Title>
      </Flex>

      <Flex align="center" gap={20}>
        <UserDropdown />
      </Flex>
    </Header>
  );
};

export default AppHeader;
