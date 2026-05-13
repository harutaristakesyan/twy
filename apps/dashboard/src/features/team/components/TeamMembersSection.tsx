import { PlusOutlined } from "@ant-design/icons";
import { useAntdTable, useRequest } from "ahooks";
import { App, Button, Flex, Table, Typography } from "antd";
import type React from "react";
import { useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { getTeamMembers, removeTeamMember } from "../api/teamApi";
import type { TeamMember } from "../types/team";
import AddMemberPicker from "./AddMemberPicker";
import { useTeamMemberColumns } from "./useTeamMemberColumns";

const { Text } = Typography;

interface TeamMembersSectionProps {
  teamId: string;
}

const TeamMembersSection: React.FC<TeamMembersSectionProps> = ({ teamId }) => {
  const { message } = App.useApp();
  const [showPicker, setShowPicker] = useState(false);

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize }) => {
      const result = await getTeamMembers(teamId, { page: current - 1, limit: pageSize });
      return { list: result.items, total: result.total };
    },
    { defaultPageSize: 20, refreshDeps: [teamId] },
  );

  const { run: removeMember } = useRequest(
    (memberId: string) => removeTeamMember(teamId, memberId),
    {
      manual: true,
      onSuccess: () => {
        message.success("Member removed");
        refresh();
      },
      onError: (error) => message.error(getErrorMessage(error)),
    },
  );

  const columns = useTeamMemberColumns(removeMember);

  const handleAdded = () => {
    setShowPicker(false);
    refresh();
  };

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
