import { EyeOutlined } from "@ant-design/icons";
import { Button, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { CarrierRequest } from "../types/carrierRequest";

const { Text } = Typography;

const statusColors: Record<string, string> = {
  pending: "processing",
  approved: "success",
  rejected: "error",
};

export function useCarrierRequestColumns(
  openView: (record: CarrierRequest) => void,
): ColumnsType<CarrierRequest> {
  return [
    {
      title: "Kind",
      dataIndex: "kind",
      key: "kind",
      width: 90,
      render: (k: string) => <Tag>{k === "twy" ? "Twy" : "Outside"}</Tag>,
    },
    { title: "Carrier name", dataIndex: "carrierName", key: "carrierName", sorter: true },
    {
      title: "MC / DOT",
      dataIndex: "mcDotNumber",
      key: "mcDotNumber",
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
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => openView(r)}>
          View
        </Button>
      ),
    },
  ];
}
