import { Card, Descriptions, Flex, Tag, Typography } from "antd";
import type { BrokerRequest } from "../types/brokerRequest";

const { Text } = Typography;

const statusColors: Record<string, string> = {
  pending: "processing",
  approved: "success",
  rejected: "error",
};

export function BrokerRequestDetails({ record }: { record: BrokerRequest }) {
  return (
    <Descriptions column={1} size="small" bordered>
      <Descriptions.Item label="Broker name">{record.brokerName}</Descriptions.Item>
      <Descriptions.Item label="MC number">
        <Text code>{record.mcNumber}</Text>
      </Descriptions.Item>
      <Descriptions.Item label="Contact name">
        {record.contactName ?? <Text type="secondary">—</Text>}
      </Descriptions.Item>
      <Descriptions.Item label="Phone">
        {record.phone ?? <Text type="secondary">—</Text>}
      </Descriptions.Item>
      <Descriptions.Item label="Email">
        {record.email ?? <Text type="secondary">—</Text>}
      </Descriptions.Item>
      <Descriptions.Item label="Address">
        {record.address ?? <Text type="secondary">—</Text>}
      </Descriptions.Item>
      <Descriptions.Item label="Credit limit">
        {record.creditLimitUnlimited ? (
          <Tag color="blue">Unlimited</Tag>
        ) : record.creditLimit !== null ? (
          new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(
            record.creditLimit,
          )
        ) : (
          <Text type="secondary">—</Text>
        )}
      </Descriptions.Item>
      <Descriptions.Item label="Notes">
        {record.notes ?? <Text type="secondary">—</Text>}
      </Descriptions.Item>
      <Descriptions.Item label="Status">
        <Tag color={statusColors[record.status] ?? "default"}>{record.status}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="Submitted">
        {new Date(record.createdAt).toLocaleString()}
        {record.submittedByName && <Text type="secondary"> by {record.submittedByName}</Text>}
      </Descriptions.Item>
    </Descriptions>
  );
}

export function BrokerRequestReviewSummary({ record }: { record: BrokerRequest }) {
  if (!(record.status === "approved" || record.status === "rejected") || !record.reviewedAt) {
    return null;
  }
  return (
    <Card size="small">
      <Flex vertical gap={4}>
        <Text strong>
          {record.status === "approved" ? "Approved" : "Rejected"}
          {record.reviewedByName && <Text> by {record.reviewedByName}</Text>}
        </Text>
        <Text type="secondary">{new Date(record.reviewedAt).toLocaleString()}</Text>
        {record.status === "rejected" && record.rejectionReason && (
          <Flex vertical gap={4} style={{ marginTop: 8 }}>
            <Text type="secondary">Reason:</Text>
            <Text>{record.rejectionReason}</Text>
          </Flex>
        )}
      </Flex>
    </Card>
  );
}
