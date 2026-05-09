import { Card, Flex, Typography } from "antd";

const { Title } = Typography;

export default function ExternalBillingPage() {
  return (
    <Card>
      <Flex justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          External Billing
        </Title>
      </Flex>
    </Card>
  );
}
