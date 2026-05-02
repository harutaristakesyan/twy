import { DeleteOutlined, EditOutlined, UserOutlined } from "@ant-design/icons";
import { Badge, Button, Popconfirm, Space, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUserModal } from "../providers/UserModalProvider";
import type { User } from "../types/user";
import { USER_ROLE_LABELS, UserRole } from "../types/user";

const { Text } = Typography;

const roleColor: Record<UserRole, string> = {
  [UserRole.OWNER]: "red",
  [UserRole.HEAD_OWNER]: "magenta",
  [UserRole.HEAD_ACCOUNTANT]: "purple",
  [UserRole.ACCOUNTANT]: "blue",
  [UserRole.AGENT]: "green",
  [UserRole.CARRIER]: "orange",
};

export function useUserColumns(
  refresh: () => void,
  runDelete: (id: string) => void,
): ColumnsType<User> {
  const { user: currentUser } = useCurrentUser();
  const { openUserEdit } = useUserModal();

  return useMemo(
    () => [
      {
        title: "Name",
        dataIndex: "firstName",
        key: "firstName",
        render: (_, record) => (
          <Space>
            <UserOutlined />
            <div>
              <div style={{ fontWeight: 500 }}>
                {record.firstName} {record.lastName}
              </div>
              <Text type="secondary" style={{ fontSize: "12px" }}>
                {record.email}
              </Text>
            </div>
          </Space>
        ),
        sorter: true,
      },
      {
        title: "Role",
        dataIndex: "role",
        key: "role",
        render: (role: UserRole) => <Tag color={roleColor[role]}>{USER_ROLE_LABELS[role]}</Tag>,
        sorter: true,
      },
      {
        title: "Branch",
        dataIndex: "branchName",
        key: "branch",
        render: (branchName, record) => record.branch?.name || branchName || "N/A",
        sorter: true,
      },
      {
        title: "Status",
        dataIndex: "isActive",
        key: "isActive",
        render: (isActive: boolean) => (
          <Badge status={isActive ? "success" : "error"} text={isActive ? "Active" : "Inactive"} />
        ),
        sorter: true,
      },
      {
        title: "Registered Date",
        dataIndex: "createdAt",
        key: "createdAt",
        render: (date: string, record) => {
          const dateToShow = date || record.registeredDate;
          return dateToShow ? new Date(dateToShow).toLocaleDateString() : "N/A";
        },
        sorter: true,
      },
      {
        title: "Actions",
        key: "actions",
        render: (_, record) => {
          const isCurrentUser = currentUser?.email === record.email;
          const tooltip = "You cannot edit or delete your own account";
          return (
            <Space>
              <Tooltip title={isCurrentUser ? tooltip : undefined}>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openUserEdit({ user: record }, () => refresh())}
                  disabled={isCurrentUser}
                />
              </Tooltip>
              <Tooltip title={isCurrentUser ? tooltip : undefined}>
                <Popconfirm
                  title="Are you sure you want to delete this user?"
                  description="This action cannot be undone."
                  onConfirm={() => runDelete(record.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="text" danger icon={<DeleteOutlined />} disabled={isCurrentUser} />
                </Popconfirm>
              </Tooltip>
            </Space>
          );
        },
      },
    ],
    [currentUser, openUserEdit, refresh, runDelete],
  );
}
