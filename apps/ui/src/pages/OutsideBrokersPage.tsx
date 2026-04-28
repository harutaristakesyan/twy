import { TeamOutlined } from "@ant-design/icons";
import { Flex, Typography } from "antd";
import type React from "react";
import OutsideBrokersManagementTable from "@/features/outside-broker-management/OutsideBrokersManagementTable";

const { Title, Text } = Typography;

const OutsideBrokersPage: React.FC = () => {
  return (
    <Flex vertical gap={24}>
      <div>
        <Title level={2} style={{ margin: 0 }}>
          <TeamOutlined style={{ marginRight: 8 }} />
          OutSide Brokers
        </Title>
        <Text type="secondary">
          Manage outside brokers and their status. System uses this data to auto-approve or
          auto-deny loads.
        </Text>
      </div>

      <OutsideBrokersManagementTable />
    </Flex>
  );
};

export default OutsideBrokersPage;
