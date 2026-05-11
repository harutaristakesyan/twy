import {
  CarOutlined,
  DeleteOutlined,
  EditOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { Button, Flex, Popconfirm, Space, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCarrierModal } from "../providers/CarrierModalProvider";
import type { Carrier, CarrierKind } from "../types/carrier";
import { CarrierStatus } from "../types/carrier";
import { deriveInsuranceStatus } from "../utils/insuranceStatus";

const { Text } = Typography;

const carrierStatusColor: Record<CarrierStatus, string> = {
  [CarrierStatus.APPROVED]: "success",
  [CarrierStatus.DENIED]: "error",
};

const carrierStatusLabel: Record<CarrierStatus, string> = {
  [CarrierStatus.APPROVED]: "Approved",
  [CarrierStatus.DENIED]: "Denied",
};

export function useCarrierColumns(
  refresh: () => void,
  runDelete: (id: string) => void,
  kind: CarrierKind,
): ColumnsType<Carrier> {
  const { permissions } = useCurrentUser();
  const { openCarrierEdit } = useCarrierModal();
  const editResource = kind === "twy" ? "carriers_twy" : "carriers_outside";
  const canUpdate = permissions[editResource]?.edit;
  const canDelete = permissions[editResource]?.edit;

  return [
    {
      title: "Carrier Name",
      dataIndex: "carrierName",
      key: "carrierName",
      render: (name: string) => (
        <Space>
          <CarOutlined />
          <span style={{ fontWeight: 500 }}>{name}</span>
        </Space>
      ),
      sorter: true,
    },
    {
      title: "MC / DOT Number",
      dataIndex: "mcDotNumber",
      key: "mcDotNumber",
      render: (mcDotNumber: string) => <Text code>{mcDotNumber}</Text>,
      sorter: true,
    },
    {
      title: "Equipment Type",
      dataIndex: "equipmentType",
      key: "equipmentType",
      render: (equipmentType: string | null) =>
        equipmentType ? <Text>{equipmentType}</Text> : <Tag color="default">Not Specified</Tag>,
    },
    {
      title: "Insurance Status",
      dataIndex: "insuranceStatus",
      key: "insuranceStatus",
      sorter: true,
      render: (_, record) => {
        const { color, label } = deriveInsuranceStatus(record.insuranceExpiry);
        return (
          <Tag color={color}>
            <SafetyOutlined style={{ marginRight: 4 }} />
            {label}
          </Tag>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: CarrierStatus) => (
        <Tag color={carrierStatusColor[status]}>{carrierStatusLabel[status]}</Tag>
      ),
      sorter: true,
    },
    {
      title: "Contact Info",
      key: "contact",
      render: (_, record) => (
        <Flex vertical gap="small">
          {record.phone && (
            <Space size="small">
              <PhoneOutlined />
              <Text>{record.phone}</Text>
            </Space>
          )}
          {record.email && (
            <Space size="small">
              <MailOutlined />
              <Text type="secondary" style={{ fontSize: "12px" }}>
                {record.email}
              </Text>
            </Space>
          )}
          {!record.phone && !record.email && <Tag color="default">No Contact Info</Tag>}
        </Flex>
      ),
    },
    {
      title: "Created Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => (date ? new Date(date).toLocaleDateString() : "N/A"),
      sorter: true,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          {canUpdate && (
            <Tooltip title="Edit Carrier">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => openCarrierEdit({ carrier: record }, () => refresh())}
              />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title="Are you sure you want to delete this carrier?"
              description="This action cannot be undone."
              onConfirm={() => runDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Delete Carrier">
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];
}
