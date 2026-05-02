import {
  BankOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Button, Flex, Popconfirm, Space, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import type { Branch } from "@/features/branch/types/branch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useOutsideBrokerModal } from "../providers/OutsideBrokerModalProvider";
import type { OutsideBroker } from "../types/broker";
import { BrokerStatus } from "../types/broker";

const { Text } = Typography;

const statusColor: Record<BrokerStatus, string> = {
  [BrokerStatus.APPROVED]: "success",
  [BrokerStatus.PENDING]: "warning",
  [BrokerStatus.DENIED]: "error",
};

const statusLabel: Record<BrokerStatus, string> = {
  [BrokerStatus.APPROVED]: "Approved",
  [BrokerStatus.PENDING]: "Pending",
  [BrokerStatus.DENIED]: "Denied",
};

export function useOutsideBrokerColumns(
  refresh: () => void,
  runDelete: (id: string) => void,
  branches: Branch[],
  branchesLoading: boolean,
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
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status: BrokerStatus) => (
          <Tag color={statusColor[status]}>{statusLabel[status]}</Tag>
        ),
        sorter: true,
      },
      {
        title: "Credit Limit",
        key: "creditLimit",
        render: (_, record) =>
          record.creditLimitUnlimited ? (
            <Tag color="green">Unlimited</Tag>
          ) : (
            <Text>
              <DollarOutlined style={{ marginRight: 4 }} />
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
        title: "Branch",
        dataIndex: "branch",
        key: "branch",
        render: (branch) =>
          branch ? (
            <Space>
              <BankOutlined />
              <Text>{branch.name}</Text>
            </Space>
          ) : (
            <Tag color="default">No Branch</Tag>
          ),
        sorter: true,
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
                  onClick={() =>
                    openOutsideBrokerEdit(
                      { broker: record, branches, loadingBranches: branchesLoading },
                      () => refresh(),
                    )
                  }
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
    [branches, branchesLoading, canDelete, canUpdate, openOutsideBrokerEdit, refresh, runDelete],
  );
}
