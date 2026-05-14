import { BankOutlined, DeleteOutlined, EditOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Popconfirm, Space, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import type { User } from "@/features/user/types/user";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useBranchModal } from "../providers/BranchModalProvider";
import type { Branch } from "../types/branch";

const { Text } = Typography;

export function useBranchColumns(
  refresh: () => void,
  runDelete: (id: string) => void,
  owners: User[],
  ownersLoading: boolean,
): ColumnsType<Branch> {
  const { openBranchEdit } = useBranchModal();
  const { permissions } = useCurrentUser();
  const canEdit = permissions.branches.edit;

  return useMemo(
    () => [
      {
        title: "Branch Name",
        dataIndex: "name",
        key: "name",
        render: (name: string) => (
          <Space>
            <BankOutlined />
            <span style={{ fontWeight: 500 }}>{name}</span>
          </Space>
        ),
        sorter: true,
      },
      {
        title: "Owner",
        dataIndex: "owner",
        key: "owner",
        render: (owner) =>
          owner ? (
            <Space>
              <UserOutlined />
              <div>
                <div style={{ fontWeight: 500 }}>
                  {owner.firstName} {owner.lastName}
                </div>
                <Text type="secondary" style={{ fontSize: "12px" }}>
                  {owner.email}
                </Text>
              </div>
            </Space>
          ) : (
            <Tag color="default">No Owner</Tag>
          ),
      },
      {
        title: "Contact",
        dataIndex: "contact",
        key: "contact",
        render: (contact: string | null) =>
          contact ? (
            <Tooltip title={contact}>
              <Text ellipsis style={{ maxWidth: 200, display: "block" }}>
                {contact}
              </Text>
            </Tooltip>
          ) : (
            <Tag color="default">No Contact</Tag>
          ),
      },
      {
        title: "Community License",
        dataIndex: "ci",
        key: "ci",
        render: (ci: Branch["ci"]) =>
          ci ? <span>{ci.ciNumber}</span> : <Tag color="default">—</Tag>,
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
            {canEdit && (
              <Tooltip title="Edit Branch">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() =>
                    openBranchEdit({ branch: record, owners, loadingOwners: ownersLoading }, () =>
                      refresh(),
                    )
                  }
                />
              </Tooltip>
            )}
            {canEdit && (
              <Popconfirm
                title="Are you sure you want to delete this branch?"
                description="This action cannot be undone. All associated data may be affected."
                onConfirm={() => runDelete(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Tooltip title="Delete Branch">
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        ),
      },
    ],
    [canEdit, openBranchEdit, owners, ownersLoading, refresh, runDelete],
  );
}
