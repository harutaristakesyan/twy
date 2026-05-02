import { TruckOutlined } from "@ant-design/icons";
import { Flex, Typography } from "antd";
import type React from "react";
import { LoadManagementTable } from "@/features/load-management";

const { Title } = Typography;

const LoadsPage: React.FC = () => {
  return (
    <Flex vertical gap={24}>
      <Title level={2}>
        <TruckOutlined style={{ marginRight: 8 }} />
        Loads Management
      </Title>
      <LoadManagementTable />
    </Flex>
  );
};

export default LoadsPage;
