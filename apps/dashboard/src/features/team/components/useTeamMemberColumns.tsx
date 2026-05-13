import { DeleteOutlined } from "@ant-design/icons";
import { Button, Popconfirm, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { TeamMember } from "../types/team";

const { Text } = Typography;

export function useTeamMemberColumns(
  removeMember: (memberId: string) => void,
): ColumnsType<TeamMember> {
  return [
    {
      title: "Name",
      key: "name",
      render: (_, r) => (
        <Text>
          {r.firstName} {r.lastName}
        </Text>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (active: boolean) => (
        <Tag color={active ? "green" : "red"}>{active ? "Active" : "Inactive"}</Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_, r) => (
        <Popconfirm
          title="Remove member?"
          description="This will unassign the user from this team."
          onConfirm={() => removeMember(r.id)}
          okText="Remove"
          cancelText="Cancel"
        >
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];
}
