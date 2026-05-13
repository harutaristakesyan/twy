import { EyeOutlined } from "@ant-design/icons";
import { Button, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { BrokerRequest } from "../types/brokerRequest";

const { Text } = Typography;

const statusColors: Record<string, string> = {
  pending: "processing",
  approved: "success",
  rejected: "error",
};

export function useBrokerRequestColumns(
  openView: (record: BrokerRequest) => void,
  canView: boolean,
): ColumnsType<BrokerRequest> {
  return [
    { title: "Broker name", dataIndex: "brokerName", key: "brokerName", sorter: true },
    {
      title: "MC number",
      dataIndex: "mcNumber",
      key: "mcNumber",
      render: (v: string) => <Text code>{v}</Text>,
      sorter: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (st: string) => <Tag color={statusColors[st] ?? "default"}>{st}</Tag>,
      sorter: true,
    },
    {
      title: "Submitted",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (d: string) => (d ? new Date(d).toLocaleDateString() : "—"),
      sorter: true,
    },
    {
      title: "Reviewed by",
      key: "reviewedBy",
      width: 140,
      render: (_, r) =>
        r.reviewedByName ? <Text>{r.reviewedByName}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 90,
      fixed: "right",
      render: (_, row) =>
        canView ? (
          <Button size="small" icon={<EyeOutlined />} onClick={() => openView(row)}>
            View
          </Button>
        ) : null,
    },
  ];
}
