import { Tabs } from "antd";
import type React from "react";
import CIManagementPage from "@/features/community-license/pages/CIManagementPage";

const SettingsPage: React.FC = () => (
  <Tabs
    defaultActiveKey="community-licenses"
    items={[
      {
        key: "community-licenses",
        label: "Community Licenses",
        children: <CIManagementPage />,
      },
    ]}
    style={{ padding: "0 8px" }}
  />
);

export default SettingsPage;
