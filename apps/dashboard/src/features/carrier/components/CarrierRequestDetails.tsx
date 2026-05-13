import { Card, Descriptions, Flex, Tag, Typography } from "antd";
import type { CarrierRequest } from "../types/carrierRequest";
import { deriveInsuranceStatus } from "../utils/insuranceStatus";

const { Text } = Typography;

const statusColors: Record<string, string> = {
  pending: "processing",
  approved: "success",
  rejected: "error",
};

export function CarrierRequestDetails({ record }: { record: CarrierRequest }) {
  return (
    <Descriptions column={1} size="small" bordered>
      <Descriptions.Item label="Kind">
        <Tag>{record.kind === "twy" ? "Twy" : "Outside"}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="Carrier name">{record.carrierName}</Descriptions.Item>
      <Descriptions.Item label="MC / DOT">
        <Text code>{record.mcDotNumber}</Text>
      </Descriptions.Item>
      <Descriptions.Item label="Equipment type">
        {record.equipmentType ?? <Text type="secondary">—</Text>}
      </Descriptions.Item>
      <Descriptions.Item label="Insurance status">
        {record.insuranceExpiry ? (
          (() => {
            const { color, label } = deriveInsuranceStatus(record.insuranceExpiry);
            return <Tag color={color}>{label}</Tag>;
          })()
        ) : (
          <Text type="secondary">—</Text>
        )}
      </Descriptions.Item>
      <Descriptions.Item label="Insurance expiry">
        {record.insuranceExpiry ? (
          new Date(record.insuranceExpiry).toLocaleDateString()
        ) : (
          <Text type="secondary">—</Text>
        )}
      </Descriptions.Item>
      <Descriptions.Item label="Phone">
        {record.phone ?? <Text type="secondary">—</Text>}
      </Descriptions.Item>
      <Descriptions.Item label="Email">
        {record.email ?? <Text type="secondary">—</Text>}
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

export function CarrierRequestReviewSummary({ record }: { record: CarrierRequest }) {
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
