import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useAntdTable } from "ahooks";
import { Button, Flex, message, Popconfirm, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type React from "react";
import { useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { getTeamMembers, removeTeamMember } from "../api/teamApi";
import type { TeamMember } from "../types/team";
import AddMemberPicker from "./AddMemberPicker";

const { Text } = Typography;

interface TeamMembersSectionProps {
  teamId: string;
}

const TeamMembersSection: React.FC<TeamMembersSectionProps> = ({ teamId }) => {
  const [showPicker, setShowPicker] = useState(false);

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize }) => {
      const result = await getTeamMembers(teamId, { page: current - 1, limit: pageSize });

      return { list: result.items, total: result.total };
    },
    { defaultPageSize: 20, refreshDeps: [teamId] },
  );

  const handleRemove = async (memberId: string) => {
    try {
      await removeTeamMember(teamId, memberId);
      message.success("Member removed");
      refresh();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const handleAdded = () => {
    setShowPicker(false);
    refresh();
  };

  const columns: ColumnsType<TeamMember> = [
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
          onConfirm={() => handleRemove(r.id)}
          okText="Remove"
          cancelText="Cancel"
        >
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <Flex justify="space-between">
        <Text>Members</Text>
        {showPicker ? (
          <AddMemberPicker
            teamId={teamId}
            onAdded={handleAdded}
            onCancel={() => setShowPicker(false)}
          />
        ) : (
          <Button size="small" icon={<PlusOutlined />} onClick={() => setShowPicker(true)}>
            Add member
          </Button>
        )}
      </Flex>

      <Table<TeamMember> columns={columns} rowKey="id" size="small" {...tableProps} />
    </>
  );
};

export default TeamMembersSection;
