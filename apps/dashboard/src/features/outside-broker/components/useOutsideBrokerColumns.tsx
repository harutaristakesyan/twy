import {
  DeleteOutlined,
  EditOutlined,
  EuroOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Button, Flex, Popconfirm, Space, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useOutsideBrokerModal } from "../providers/OutsideBrokerModalProvider";
import type { OutsideBroker } from "../types/broker";

const { Text } = Typography;

export function useOutsideBrokerColumns(
  refresh: () => void,
  runDelete: (id: string) => void,
): ColumnsType<OutsideBroker> {
  const { permissions } = useCurrentUser();
  const { openOutsideBrokerEdit } = useOutsideBrokerModal();
  const canUpdate = permissions.brokers.edit;
  const canDelete = permissions.brokers.edit;

  return useMemo(
    () => [
      {
        title: "Broker Name",
        dataIndex: "brokerName",
        key: "brokerName",
        render: (name: string) => (
          <Space>
            <TeamOutlined />
            <span style={{ fontWeight: 500 }}>{name}</span>
          </Space>
        ),
        sorter: true,
      },
      {
        title: "MC Number",
        dataIndex: "mcNumber",
        key: "mcNumber",
        render: (mcNumber: string) => <Text code>{mcNumber}</Text>,
        sorter: true,
      },
      {
        title: "Contact Name",
        dataIndex: "contactName",
        key: "contactName",
        render: (contactName: string | null) =>
          contactName ? <Text>{contactName}</Text> : <Tag color="default">No Contact</Tag>,
      },
      {
        title: "Phone / Email",
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
        title: "Credit Limit",
        key: "creditLimit",
        render: (_, record) =>
          record.creditLimitUnlimited ? (
            <Tag color="green">Unlimited</Tag>
          ) : (
            <Text>
              <EuroOutlined style={{ marginRight: 4 }} />
              {record.creditLimit !== null
                ? record.creditLimit.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "—"}
            </Text>
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
              <Tooltip title="Edit Broker">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openOutsideBrokerEdit({ broker: record }, () => refresh())}
                />
              </Tooltip>
            )}
            {canDelete && (
              <Popconfirm
                title="Are you sure you want to delete this broker?"
                description="This action cannot be undone."
                onConfirm={() => runDelete(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Tooltip title="Delete Broker">
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        ),
      },
    ],
    [canDelete, canUpdate, openOutsideBrokerEdit, refresh, runDelete],
  );
}
